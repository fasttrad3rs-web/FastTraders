import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { CLOUDINARY_FOLDER, cloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

/**
 * Cloudinary upload helpers. Multer keeps files in memory; these functions
 * stream the buffers straight to Cloudinary.
 */

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const DEFAULT_OPTIONS: UploadApiOptions = {
  resource_type: 'image',
  // Cap stored dimensions; next/image handles responsive resizing downstream.
  transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
};

function toUploadedImage(result: UploadApiResponse): UploadedImage {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/** Upload a single in-memory file buffer to a Cloudinary subfolder. */
export function uploadBuffer(buffer: Buffer, subfolder = 'products'): Promise<UploadedImage> {
  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...DEFAULT_OPTIONS, folder: `${CLOUDINARY_FOLDER}/${subfolder}` },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(error?.message ?? 'Image upload failed', error));
          return;
        }
        resolve(toUploadedImage(result));
      },
    );
    stream.end(buffer);
  });
}

/** Upload many files in parallel. */
export function uploadBuffers(
  files: Express.Multer.File[],
  subfolder = 'products',
): Promise<UploadedImage[]> {
  return Promise.all(files.map((file) => uploadBuffer(file.buffer, subfolder)));
}

/** Remove an asset by its Cloudinary public id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
