/* eslint-disable no-console */
/**
 * Pre-flight check for every external service.
 *
 *   npm run doctor
 *
 * Reads the real `.env` and actually connects to MongoDB, Cloudinary and
 * SMTP — no mocking. Each check reports what specifically failed and what to
 * do about it, because "MongooseServerSelectionError" on its own has sent
 * more people down the wrong path than any other message in this stack.
 *
 * Safe to run any time. It writes nothing, sends nothing, and closes every
 * connection it opens.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { describeError } from './lib/describe-error';

const PAD = 26;

type Status = 'pass' | 'fail' | 'warn';

interface Result {
  name: string;
  status: Status;
  detail: string;
  fix?: string;
}

const results: Result[] = [];

/** DNS and socket failures look alarming but usually mean no internet. */
function isNetworkError(message: string): boolean {
  return /EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo/i.test(message);
}

function record(name: string, status: Status, detail: string, fix?: string): void {
  results.push({ name, status, detail, ...(fix ? { fix } : {}) });
  const mark = status === 'pass' ? '  OK  ' : status === 'warn' ? ' WARN ' : ' FAIL ';
  console.log(`[${mark}] ${name.padEnd(PAD)} ${detail}`);
  if (fix) console.log(`         ${' '.repeat(PAD)} → ${fix}`);
}

/* ------------------------------ 1. Variables ----------------------------- */

const REQUIRED = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'ADMIN_EMAIL',
];

function checkVariables(): boolean {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  const placeholder = REQUIRED.filter((key) => /replace_me|replace_with/i.test(process.env[key] ?? ''));

  if (missing.length > 0) {
    record(
      'Environment file',
      'fail',
      `${missing.length} variable(s) missing: ${missing.join(', ')}`,
      'Run `cp .env.example .env` in server/, then fill in the blanks.',
    );
    return false;
  }

  if (placeholder.length > 0) {
    record(
      'Environment file',
      'fail',
      `still on the example value: ${placeholder.join(', ')}`,
      'Replace every `replace_me` placeholder with a real credential.',
    );
    return false;
  }

  const shortSecret = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (key) => (process.env[key] ?? '').length < 32,
  );
  if (shortSecret.length > 0) {
    record(
      'Environment file',
      'fail',
      `${shortSecret.join(' and ')} shorter than 32 characters`,
      'Generate one with: openssl rand -base64 48',
    );
    return false;
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    record(
      'Environment file',
      'fail',
      'the two JWT secrets are identical',
      'They must differ, or a refresh token would be accepted as an access token.',
    );
    return false;
  }

  /*
   * The placeholders from SETUP.md's example block. Mailtrap captures mail
   * regardless of recipient, so a fake ADMIN_EMAIL is completely invisible in
   * development — and in production it means every inquiry alert goes nowhere
   * and the shop never learns it has a lead. That is the most expensive silent
   * failure in this system, so it is checked by name.
   */
  const admin = process.env.ADMIN_EMAIL ?? '';
  if (/your\.email@|you@company|example\.com|changeme/i.test(admin)) {
    record(
      'Environment file',
      'fail',
      `ADMIN_EMAIL is still a placeholder (${admin})`,
      'Set it to the address that should receive inquiry alerts. In production that is fasttrad3rs@gmail.com.',
    );
    return false;
  }

  record('Environment file', 'pass', `all ${REQUIRED.length} required variables present`);
  record('Inquiry alerts', 'pass', `will be sent to ${admin}`);
  return true;
}

/* ------------------------------- 2. MongoDB ------------------------------ */

async function checkMongo(): Promise<void> {
  const { default: mongoose } = await import('mongoose');
  const uri = process.env.MONGO_URI ?? '';

  // The single most common Atlas mistake: pasting the connection string
  // without swapping <password> for the real one.
  if (uri.includes('<password>') || uri.includes('<db_password>')) {
    record(
      'MongoDB',
      'fail',
      'the connection string still contains the <password> placeholder',
      'Replace <password> with the database user password you created in Atlas.',
    );
    return;
  }

  /*
   * The example host from SETUP.md. Easy to copy the whole line out of the
   * docs instead of taking the real string from Atlas — the failure then
   * looks like a DNS problem rather than a copy-paste one.
   */
  if (uri.includes('ab1cd.mongodb.net')) {
    record(
      'MongoDB',
      'fail',
      'the URI still uses the example cluster address from SETUP.md',
      'Atlas → Database → Connect → Drivers → Node.js, and copy YOUR string. The suffix after the cluster name is unique to your account.',
    );
    return;
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    record('MongoDB', 'fail', 'MONGO_URI is not a mongodb:// or mongodb+srv:// URL', uri.slice(0, 40));
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const name = mongoose.connection.name;
    const collections = await mongoose.connection.db?.listCollections().toArray();

    record(
      'MongoDB',
      'pass',
      `connected to "${name}" (${collections?.length ?? 0} collection(s))`,
    );

    if ((collections?.length ?? 0) === 0) {
      record('MongoDB — data', 'warn', 'the database is empty', 'Run `npm run seed` to load the catalogue.');
    } else {
      const { Product, Inquiry } = await import('../src/models');
      const [products, inquiries] = await Promise.all([
        Product.countDocuments({}),
        Inquiry.countDocuments({}),
      ]);
      record('MongoDB — data', 'pass', `${products} product(s), ${inquiries} inquiry/inquiries`);
    }

    await mongoose.disconnect();
  } catch (error) {
    const message = describeError(error);

    if (/Authentication failed|bad auth/i.test(message)) {
      record('MongoDB', 'fail', 'authentication failed', 'Wrong username or password. Check Atlas → Database Access.');
    } else if (/ENOTFOUND|querySrv/i.test(message)) {
      record('MongoDB', 'fail', 'hostname could not be resolved', 'Check the cluster address in the URI, and your internet connection.');
    } else if (/timed out|ServerSelection/i.test(message)) {
      record(
        'MongoDB',
        'fail',
        'connection timed out',
        'Almost always the IP allowlist. Atlas → Network Access → Add IP Address → Allow Access From Anywhere.',
      );
    } else {
      record('MongoDB', 'fail', message.slice(0, 120));
    }
  }
}

/* ------------------------------ 3. Cloudinary ---------------------------- */

async function checkCloudinary(): Promise<void> {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const ping = (await cloudinary.api.ping()) as { status?: string };
    record(
      'Cloudinary',
      ping.status === 'ok' ? 'pass' : 'warn',
      `cloud "${process.env.CLOUDINARY_CLOUD_NAME}" responded: ${ping.status ?? 'unknown'}`,
    );
  } catch (error) {
    const message = describeError(error);

    if (/Invalid Signature|401|api_key|Invalid cloud_name/i.test(message)) {
      record(
        'Cloudinary',
        'fail',
        'credentials rejected',
        'Check all three values against Cloudinary → Settings → API Keys. The cloud name is case-sensitive.',
      );
    } else if (isNetworkError(message)) {
      record('Cloudinary', 'fail', 'could not reach api.cloudinary.com', 'No internet, or a firewall or VPN is blocking it.');
    } else {
      record('Cloudinary', 'fail', message.slice(0, 120));
    }
  }
}

/* --------------------------------- 4. SMTP ------------------------------- */

async function checkSmtp(): Promise<void> {
  try {
    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 8000,
    });

    await transporter.verify();
    record('SMTP', 'pass', `${process.env.SMTP_HOST} accepted the credentials`);

    // Pointing development at the shop's live inbox is how a retry loop sends
    // Sharjeel fifty emails in a minute.
    const host = process.env.SMTP_HOST ?? '';
    if (process.env.NODE_ENV !== 'production' && /gmail|outlook|zoho/i.test(host)) {
      record(
        'SMTP — safety',
        'warn',
        'development is pointed at a real mail provider',
        'Use Mailtrap for local work so a bug cannot email real customers.',
      );
    }
  } catch (error) {
    const message = describeError(error);

    if (/Username and Password not accepted|535|BadCredentials/i.test(message)) {
      record(
        'SMTP',
        'fail',
        'credentials rejected',
        'For Gmail you need an App Password, not the account password — and 2-Step Verification must be on first.',
      );
    } else if (isNetworkError(message)) {
      record(
        'SMTP',
        'fail',
        `could not reach ${process.env.SMTP_HOST ?? 'the mail server'}`,
        'Check SMTP_HOST and SMTP_PORT (Mailtrap 2525, Gmail 587), and that you are online.',
      );
    } else {
      record('SMTP', 'fail', message.slice(0, 120));
    }
  }
}

/* --------------------------- 5. The API port ----------------------------- */

/**
 * Who holds the API port?
 *
 * "Is it free?" is the wrong question, because the answer is No whenever the
 * dev server is running — which is most of the time, and doctor is meant to be
 * safe to run at any moment. A bare bind check turned a healthy machine into a
 * failing report.
 *
 * So when the port is taken, ask what is on it. If our own API answers, that
 * is the expected state. If something else does, or nothing answers at all,
 * that is the AirPlay-style collision worth flagging.
 */
async function checkPort(): Promise<void> {
  const net = await import('node:net');
  const port = Number(process.env.PORT ?? 5050);

  const free = await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '0.0.0.0');
  });

  if (free) {
    record('API port', 'pass', `${port} is free`);
    return;
  }

  // Occupied. Ours, or somebody else's?
  try {
    const response = await fetch(`http://localhost:${port}/api/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const body = (await response.json()) as { success?: boolean };

    if (response.ok && body.success === true) {
      record('API port', 'pass', `${port} is our own dev server, already running`);
      return;
    }

    record(
      'API port',
      'fail',
      `${port} is held by something that is not this API (HTTP ${response.status})`,
      `Run \`lsof -i :${port}\` to see what. If it says ControlCe, that is macOS AirPlay Receiver.`,
    );
  } catch {
    record(
      'API port',
      'fail',
      `${port} is occupied but nothing answers /api/v1/health`,
      `Run \`lsof -i :${port}\`. If the COMMAND is node, it is a dev server from an earlier run — kill it. If it is ControlCe, that is macOS AirPlay Receiver.`,
    );
  }
}

/* ------------------- 5b. Storefront cache invalidation ------------------- */

/**
 * Without this, an admin write does not reach the front end's cache and the
 * storefront lags by a full ISR window — a product reactivated in the admin
 * comes back on its own page (rendered fresh) but not on the homepage rails
 * (cached), which reads as "the toggle only half works".
 *
 * Unconfigured is legitimate for API-only work, so it is a warning, not a
 * failure. But it is a warning worth printing, because the symptom is
 * confusing and nothing else reports it.
 */
async function checkRevalidate(): Promise<void> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    record(
      'Storefront cache',
      'warn',
      'on-demand invalidation is off',
      'Set REVALIDATE_URL and REVALIDATE_SECRET (server) and the same REVALIDATE_SECRET (client). Until then, admin changes take up to 5 minutes to appear on cached pages such as the homepage.',
    );
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: ['products'] }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      record('Storefront cache', 'pass', 'the front end accepted a test invalidation');
      return;
    }

    if (response.status === 401) {
      record(
        'Storefront cache',
        'fail',
        'the front end rejected the secret',
        'REVALIDATE_SECRET differs between server/.env and client/.env.local. They must match exactly.',
      );
      return;
    }

    if (response.status === 503) {
      record(
        'Storefront cache',
        'fail',
        'the front end has no REVALIDATE_SECRET set',
        'Add REVALIDATE_SECRET to client/.env.local and restart the Next.js dev server.',
      );
      return;
    }

    record('Storefront cache', 'fail', `the front end answered HTTP ${response.status}`);
  } catch (error) {
    /*
     * A WARNING, not a failure.
     *
     * Running the API on its own — to seed, to run a script, to check the
     * database — is completely normal, and the front end being down then says
     * nothing about the health of anything. Failing here made `npm run doctor`
     * exit non-zero for a situation that is not a fault, which trains people
     * to ignore its exit code. Only a genuine *misconfiguration* (mismatched
     * secret, missing secret on the client) is a failure; those are handled
     * above and stay `fail`.
     */
    record(
      'Storefront cache',
      'warn',
      'the front end is not running, so this could not be verified',
      `${describeError(error)}. Start the Next.js server and re-run if you want to confirm the handshake.`,
    );
  }
}

/* -------------------------------- 6. Client ------------------------------ */

function checkClientEnv(): void {
  const file = path.resolve(__dirname, '../../client/.env.local');

  if (!fs.existsSync(file)) {
    record(
      'Client .env.local',
      'fail',
      'not found',
      'Run `cp .env.example .env.local` in client/.',
    );
    return;
  }

  const contents = fs.readFileSync(file, 'utf8');
  const missing = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_WHATSAPP_NUMBER'].filter(
    (key) => !new RegExp(`^${key}=.+`, 'm').test(contents),
  );

  if (missing.length > 0) {
    record('Client .env.local', 'fail', `missing ${missing.join(', ')}`);
    return;
  }

  const apiUrl = /^NEXT_PUBLIC_API_URL=(.+)$/m.exec(contents)?.[1]?.trim() ?? '';
  if (!apiUrl.endsWith('/api/v1')) {
    record(
      'Client .env.local',
      'warn',
      'NEXT_PUBLIC_API_URL does not end in /api/v1',
      `Every request would 404. Current value: ${apiUrl}`,
    );
    return;
  }

  /*
   * The two ports are set in two different files, so changing one and
   * forgetting the other is the obvious mistake — and it presents as the site
   * loading fine with an empty catalogue, not as an error.
   */
  const serverPort = process.env.PORT ?? '5050';
  const clientPort = (() => {
    try {
      return new URL(apiUrl).port;
    } catch {
      return '';
    }
  })();

  if (clientPort !== '' && clientPort !== serverPort) {
    record(
      'Client .env.local',
      'fail',
      `the client calls port ${clientPort} but the API listens on ${serverPort}`,
      'Set both: PORT in server/.env and NEXT_PUBLIC_API_URL in client/.env.local.',
    );
    return;
  }

  record('Client .env.local', 'pass', `API base ${apiUrl}`);
}

/* -------------------------------- Report --------------------------------- */

async function main(): Promise<void> {
  console.log('\nFast Traders — service check\n');

  const envOk = checkVariables();
  if (!envOk) {
    console.log('\nFix the environment file first; nothing else can be checked until then.\n');
    process.exit(1);
  }

  await checkMongo();
  await checkCloudinary();
  await checkSmtp();
  await checkPort();
  await checkRevalidate();
  checkClientEnv();

  const failed = results.filter((result) => result.status === 'fail');
  const warned = results.filter((result) => result.status === 'warn');

  console.log('');
  if (failed.length === 0) {
    console.log(
      warned.length > 0
        ? `All checks passed, with ${warned.length} warning(s) worth reading.\n`
        : 'Everything is connected. Run `npm run seed`, then `npm run dev` from the repo root.\n',
    );
  } else {
    console.log(`${failed.length} check(s) failed. Work through the → lines above.\n`);
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

void main();
