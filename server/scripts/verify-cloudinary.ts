/* eslint-disable no-console */
/**
 * Proves the Cloudinary upload paths against the real API.
 *
 *   npm run verify:cloudinary
 *
 * Everything else about uploads is tested with the network stubbed, which
 * proves our logic and nothing about Cloudinary's. This script closes that gap:
 * it uploads a real PNG and a real PDF to the actual account, checks what came
 * back, fetches the stored files, and deletes them again.
 *
 * CORRECTION, recorded because the script earned it: this file used to claim
 * that uploading a PDF as `resource_type: 'image'` rasterises page one and
 * discards the rest. It does not. Cloudinary stores the original bytes either
 * way, and step 4 proved that by coming back byte-identical with both pages —
 * failing the assertion I had written from the wrong belief.
 *
 * The real difference is what can happen *afterwards*. An `image` PDF is
 * transformable: any URL carrying a transformation returns a rendered picture
 * instead of the document. A `raw` file is not transformable at all, so the
 * bytes a customer uploaded are the bytes staff open. Step 4 now demonstrates
 * that, which is the actual reason the `raw` branch exists.
 *
 * Writes nothing to MongoDB. Every asset it creates, it removes.
 */

/*
 * `dotenv/config`, NOT `./env-setup`. This script's entire job is to exercise
 * the real Cloudinary account, and `env-setup` assigns placeholder credentials
 * without reading `.env` — importing it made every run fail on authentication
 * while `npm run doctor`, which loads dotenv, passed on the same machine.
 */
import 'dotenv/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import zlib from 'node:zlib';
import { describeError } from './lib/describe-error';

const FOLDER = `${process.env.CLOUDINARY_FOLDER ?? 'fast-traders-dev'}/_verify`;

let failures = 0;
const created: { publicId: string; kind: 'image' | 'raw' }[] = [];

/** Turn the message into something that names the fix. */
function diagnose(message: string): string {
  if (/Invalid Signature/i.test(message)) {
    return 'CLOUDINARY_API_SECRET is wrong, or has a trailing space. Re-copy it from the dashboard (click the eye icon).';
  }
  if (/api_key|Invalid api_key|must supply api_key/i.test(message)) {
    return 'CLOUDINARY_API_KEY is missing or wrong in server/.env.';
  }
  if (/cloud_name|Invalid cloud/i.test(message)) {
    return 'CLOUDINARY_CLOUD_NAME is wrong. It is case-sensitive and is NOT your account name or email.';
  }
  if (/401|Unauthorized|disabled/i.test(message)) {
    return 'Credentials rejected. If you rotated the API secret, server/.env still has the old one.';
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|fetch failed/i.test(message)) {
    return 'Could not reach api.cloudinary.com — no internet, or a firewall or VPN is blocking it.';
  }
  if (/rate limit|420|too many/i.test(message)) {
    return 'Cloudinary rate limit hit. Free tier resets hourly; wait and retry.';
  }
  return 'Check all three values against Cloudinary → Settings → API Keys.';
}

function check(label: string, ok: boolean, detail = ''): void {
  console.log(`  ${ok ? '  OK  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

/* ------------------------------ Test fixtures ---------------------------- */

/** A real 1×1 PNG, built rather than base64-pasted so it is auditable. */
function makePng(): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) : crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); // width
  ihdr.writeUInt32BE(1, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const idat = zlib.deflateSync(Buffer.from([0x00, 0x1b, 0x2a, 0x6b])); // one navy pixel

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** CRC-32, for Node versions without `zlib.crc32`. */
function crc32(buffer: Buffer): number {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

/**
 * A real two-page PDF. Two pages matter: it is what makes the `raw` versus
 * `image` difference observable rather than theoretical.
 */
function makePdf(): Buffer {
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R 5 0 R]/Count 2>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>endobj',
    '4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 100 Td (PAGE ONE) Tj ET\nendstream endobj',
    '5 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 6 0 R>>endobj',
    '6 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 100 Td (PAGE TWO) Tj ET\nendstream endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

/* -------------------------------- Helpers -------------------------------- */

function upload(
  buffer: Buffer,
  kind: 'image' | 'raw',
  filename: string,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        resource_type: kind,
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error || !result) {
          // Same trap as `api.ping()`: the upload callback hands back a plain
          // object, so it has to go through `describeError` too.
          reject(new Error(error ? describeError(error) : 'upload returned nothing'));
          return;
        }
        created.push({ publicId: result.public_id, kind });
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

async function fetchStored(url: string): Promise<{ status: number; type: string; body: Buffer }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  return {
    status: response.status,
    type: response.headers.get('content-type') ?? '',
    body: Buffer.from(await response.arrayBuffer()),
  };
}

/* --------------------------------- Steps --------------------------------- */

async function main(): Promise<void> {
  console.log('\nCloudinary upload verification\n');

  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    if (!process.env[key]) {
      console.error(`${key} is not set. Fill in server/.env — see SETUP.md section 2.\n`);
      process.exit(1);
    }

    // The placeholder values from `scripts/env-setup.ts`. Reaching Cloudinary
    // with these produces an authentication error that reads exactly like a
    // wrong API secret, sending you to fix a credential that was never broken.
    if (process.env[key] === 'scripts') {
      console.error(
        `${key} is still the placeholder "scripts" from scripts/env-setup.ts.\n` +
          'This script must load the real server/.env — check that it imports\n' +
          "'dotenv/config' rather than './env-setup'.\n",
      );
      process.exit(1);
    }
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const png = makePng();
  const pdf = makePdf();

  /* 1. Credentials ------------------------------------------------------- */
  console.log('1. Credentials');
  console.log(`         cloud "${process.env.CLOUDINARY_CLOUD_NAME}", key ending "…${(process.env.CLOUDINARY_API_KEY ?? '').slice(-4)}"`);

  try {
    const ping = (await cloudinary.api.ping()) as { status?: string };
    check('api.ping() answers', ping.status === 'ok', ping.status ?? 'no status');
  } catch (error) {
    const message = describeError(error);
    check('api.ping() answers', false, message);
    console.log(`\n  → ${diagnose(message)}\n`);
    // Nothing below can pass if the credentials do not work, so stop cleanly
    // rather than reporting eight more failures with the same cause.
    process.exit(1);
  }

  /* 2. A photo, as an image --------------------------------------------- */
  console.log('\n2. Nameplate photo -> resource_type "image"');
  const image = await upload(png, 'image', 'nameplate.png');
  check('resource_type is image', image.resource_type === 'image', image.resource_type);
  check('landed in the right folder', image.public_id.startsWith(FOLDER), image.public_id);
  check('URL is https', image.secure_url.startsWith('https://'), image.secure_url);
  check('Cloudinary parsed it as a picture', image.width === 1 && image.height === 1,
    `${image.width}x${image.height}`);

  const fetchedImage = await fetchStored(image.secure_url);
  check('the stored file is reachable', fetchedImage.status === 200, `HTTP ${fetchedImage.status}`);
  check('served as an image', fetchedImage.type.startsWith('image/'), fetchedImage.type);

  /* 3. A datasheet, as raw ---------------------------------------------- */
  console.log('\n3. Datasheet -> resource_type "raw"');
  const raw = await upload(pdf, 'raw', 'datasheet.pdf');
  check('resource_type is raw', raw.resource_type === 'raw', raw.resource_type);
  check('landed in the right folder', raw.public_id.startsWith(FOLDER), raw.public_id);
  check('byte count preserved', raw.bytes === pdf.length, `${raw.bytes} vs ${pdf.length}`);

  const fetchedRaw = await fetchStored(raw.secure_url);
  const pdfDeliverable = fetchedRaw.status === 200;
  check('the stored file is reachable', pdfDeliverable, `HTTP ${fetchedRaw.status}`);

  if (pdfDeliverable) {
    check(
      'bytes come back identical',
      fetchedRaw.body.equals(pdf),
      `${fetchedRaw.body.length} bytes back`,
    );
    check(
      'both pages survived',
      fetchedRaw.body.includes('PAGE ONE') && fetchedRaw.body.includes('PAGE TWO'),
      'a rasterised PDF would have lost page two',
    );
  } else {
    /*
     * A 401 on delivery, when the upload itself succeeded, is an account
     * setting rather than a code fault. Two candidates, and they need
     * different fixes — so run the experiment that tells them apart instead
     * of guessing: store a plain text file the same way and fetch it.
     *
     *   .txt delivers, .pdf does not  ->  the PDF *format* is restricted
     *   neither delivers              ->  raw delivery is off for the account
     */
    console.log('\n   Delivery was refused. Narrowing down why…');
    const probe = await upload(Buffer.from('control file\n'), 'raw', 'control.txt');
    const fetchedProbe = await fetchStored(probe.secure_url);

    check(
      'a plain .txt delivers from the same folder',
      fetchedProbe.status === 200,
      `HTTP ${fetchedProbe.status}`,
    );

    console.log(
      fetchedProbe.status === 200
        ? '\n  → PDF delivery is blocked for this account, not raw delivery.\n' +
            '    Cloudinary restricts PDF and ZIP by default on newer accounts.\n' +
            '    Console → Settings → Security → "Restricted media types":\n' +
            '    untick PDF, save, and re-run. Nothing in the code needs changing.\n' +
            '\n    This matters: staff open a customer\'s datasheet from the link in\n' +
            '    the alert email. Left as is, every one of those links 401s.\n'
        : '\n  → Raw delivery is refused for this account entirely, not just PDFs.\n' +
            '    Check Settings → Security for delivery restrictions, and that the\n' +
            '    account is not suspended or over quota.\n',
    );
  }

  /* 4. What raw actually buys you --------------------------------------- */
  console.log('\n4. The same PDF as "image" — what actually differs');
  try {
    const wrong = await upload(pdf, 'image', 'datasheet-as-image.pdf');
    const untouched = await fetchStored(wrong.secure_url);

    // Not a failure: Cloudinary keeps the original either way. Recorded so the
    // next person does not repeat the mistake this script corrected.
    check(
      'stored as image, the untransformed URL still returns the original',
      untouched.status === 200 && untouched.body.equals(pdf),
      `HTTP ${untouched.status}, ${untouched.body.length} bytes`,
    );

    /*
     * The part that matters. Ask for a format conversion and the document
     * becomes a picture of page one — which is what a stray transformation, a
     * CDN rule or an `f_auto` in somebody's URL builder would do to a
     * customer's twelve-page datasheet. A `raw` asset cannot be transformed,
     * so it cannot be damaged this way.
     */
    const rasterised = cloudinary.url(wrong.public_id, {
      resource_type: 'image',
      format: 'jpg',
      transformation: [{ page: 1 }],
    });
    const transformed = await fetchStored(rasterised);

    check(
      'but a transformation rasterises it to page one',
      transformed.status === 200 && !transformed.body.equals(pdf),
      `HTTP ${transformed.status}, ${transformed.type}, ${transformed.body.length} bytes`,
    );

    console.log(
      '         That is why attachments go up as raw: a raw asset has no\n' +
        '         transformation surface, so the bytes staff open are the bytes\n' +
        '         the customer sent.',
    );
  } catch (error) {
    check('the image path behaved as expected', false, describeError(error).slice(0, 90));
  }

  /* 5. Clean up ---------------------------------------------------------- */
  console.log('\n5. Cleanup');
  for (const asset of created) {
    // `resource_type` must match the upload, or destroy silently no-ops —
    // which is how orphaned raw files accumulate on a free tier.
    const result = (await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.kind,
    })) as { result?: string };
    check(`removed ${asset.publicId}`, result.result === 'ok', result.result ?? 'no result');
  }

  console.log(
    failures === 0
      ? '\nBoth upload paths work against the real Cloudinary account.\n'
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  const message = describeError(error);
  console.error(`\nVerification aborted: ${message}`);
  console.error(`  → ${diagnose(message)}\n`);

  if (created.length > 0) {
    console.error(
      `${created.length} test asset(s) may be left behind. Remove the ` +
        `"_verify" folder in the Cloudinary Media Library if so.\n`,
    );
  }
  process.exit(1);
});
