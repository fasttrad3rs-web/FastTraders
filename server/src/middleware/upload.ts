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

const IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const DOCUMENT_MIME_TYPES: readonly string[] = ['application/pdf'];

/** Build a Multer instance restricted to a MIME allow-list. */
function createUploader(allowed: readonly string[], label: string): multer.Multer {
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
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 8 },
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
