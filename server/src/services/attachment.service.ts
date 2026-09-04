import { CLOUDINARY_FOLDER, cloudinary } from '../config/cloudinary';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { resourceKindFor, verifyFileSignature } from '../utils/file-signature';
import type { ReferenceFile } from '../types';

/**
 * Sourcing-request attachments.
 *
 * Separate from `upload.service.ts` because the rules are different in three
 * ways that matter:
 *
 *  1. Documents go up as `resource_type: 'raw'`, which has no transformation
 *     surface. An `image` asset keeps the original bytes too — verified, not
 *     assumed — but *any* URL carrying a transformation returns a rendered
 *     picture of page one instead of the document. A stray `f_auto` from a
 *     URL builder or a CDN rule would silently hand staff a screenshot of a
 *     customer's twelve-page datasheet. Raw cannot be transformed, so the
 *     bytes that arrive are the bytes that were sent.
 *  2. No transformation. A nameplate photo is evidence; resizing it can make
 *     the part number unreadable, which is the whole reason it was sent.
 *  3. Every buffer is checked against its own bytes first. The MIME type came
 *     from the uploader and is worth nothing on its own.
 *
 * ACCOUNT SETTING, not code: Cloudinary blocks PDF and ZIP *delivery* by
 * default on newer accounts. Uploads succeed and the stored URL then 401s, so
 * staff clicking a datasheet link in the alert email get nothing. Untick PDF
 * under Settings → Security → Restricted media types. `npm run verify:cloudinary`
 * detects this and says so.
 */

/** Where sourcing attachments live, kept away from catalogue imagery. */
const SUBFOLDER = 'sourcing';

interface UploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
}

function uploadOne(
  buffer: Buffer,
  kind: 'image' | 'raw',
  filename: string,
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${CLOUDINARY_FOLDER}/${SUBFOLDER}`,
        resource_type: kind,
        /*
         * `access_mode: 'authenticated'` is deliberately NOT set. These URLs
         * go into the alert email, and staff open them from a phone — a signed
         * URL would expire before somebody got back to their desk. They are
         * unguessable rather than private, which suits a nameplate photo.
         */
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(error?.message ?? 'Attachment upload failed', error));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

/** Trim a client-supplied filename to something safe to store and display. */
function safeName(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? 'attachment';
  return base.replace(/[^\w.\- ]+/g, '_').slice(0, 200) || 'attachment';
}

export interface AttachmentOutcome {
  files: ReferenceFile[];
  /** Files refused by the signature check, with the reason, for the reply. */
  rejected: { name: string; reason: string }[];
}

/**
 * Verify and upload every attachment on a sourcing request.
 *
 * A rejected file does **not** fail the request. Somebody photographing a
 * failed breaker at 6pm should not lose their whole enquiry because one of
 * four files was a screenshot in an odd format — the text is the lead, the
 * attachments are supporting evidence. What each rejection was is returned so
 * the reply can say so plainly.
 */
export async function uploadSourcingAttachments(
  files: Express.Multer.File[],
): Promise<AttachmentOutcome> {
  const accepted: { file: Express.Multer.File; kind: 'image' | 'raw' }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const check = verifyFileSignature(file.buffer, file.mimetype);

    if (!check.ok || !check.detected) {
      rejected.push({ name: safeName(file.originalname), reason: check.reason ?? 'unsupported file' });
      logger.warn(
        `[sourcing] Rejected "${file.originalname}" (${file.mimetype}): ${check.reason ?? 'unknown'}`,
      );
      continue;
    }

    accepted.push({ file, kind: resourceKindFor(check.detected) });
  }

  const uploaded = await Promise.all(
    accepted.map(async ({ file, kind }) => {
      const name = safeName(file.originalname);
      const result = await uploadOne(file.buffer, kind, name);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        name,
        type: file.mimetype,
      } satisfies ReferenceFile;
    }),
  );

  return { files: uploaded, rejected };
}
