import type { Request } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { ApiError } from '../utils/ApiError';

/**
 * Multer configured with in-memory storage.
 *
 * Files are held as buffers and piped to Cloudinary by
 * `services/upload.service.ts` — nothing ever touches the server disk, which
 * matters on ephemeral hosts like Railway/Render.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
/** Sourcing attachments run larger: drawings and datasheets, not thumbnails. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS = 5;

const IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const DOCUMENT_MIME_TYPES: readonly string[] = ['application/pdf'];

/*
 * What a sourcing request actually arrives as: a phone photo of a nameplate, a
 * datasheet, a panel drawing, a bill of materials.
 *
 * DWG is listed under three types because browsers disagree — Chrome tends to
 * send `image/vnd.dwg`, Safari `application/acad`, and several recognise
 * nothing and fall back to octet-stream. That last entry is why the MIME list
 * cannot be the real control: `application/octet-stream` means "some bytes".
 * `utils/file-signature.ts` is what actually decides.
 */
const ATTACHMENT_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/vnd.dwg',
  'application/acad',
  'application/octet-stream',
];

/** Build a Multer instance restricted to a MIME allow-list. */
function createUploader(
  allowed: readonly string[],
  label: string,
  limits?: { fileSize: number; files: number },
): multer.Multer {
  const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest(`Only ${label} are allowed (received ${file.mimetype})`));
  };

  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: limits ?? { fileSize: MAX_FILE_SIZE_BYTES, files: 8 },
  });
}

/** Product and banner imagery. */
export const imageUpload = createUploader(IMAGE_MIME_TYPES, 'JPEG, PNG, WebP and AVIF images');

/** Datasheets and RFQ attachments. */
export const documentUpload = createUploader(DOCUMENT_MIME_TYPES, 'PDF files');

/** Mixed: product galleries that may also carry a datasheet. */
export const mediaUpload = createUploader(
  [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
  'images and PDF files',
);

export const uploadSingleImage = imageUpload.single('image');
export const uploadProductImages = imageUpload.array('images', 8);
export const uploadDatasheets = documentUpload.array('datasheets', 5);
export const uploadAttachments = documentUpload.array('attachments', 5);

/**
 * Sourcing request attachments.
 *
 * A first line of defence only. Multer trusts the `Content-Type` the uploader
 * wrote, so this stops honest mistakes and nothing else — the signature check
 * downstream is the control.
 */
export const sourcingUpload = createUploader(
  ATTACHMENT_MIME_TYPES,
  'photos, PDFs, DWG drawings and spreadsheets',
  { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_ATTACHMENTS },
);

export const uploadSourcingFiles = sourcingUpload.array('attachments', MAX_ATTACHMENTS);
