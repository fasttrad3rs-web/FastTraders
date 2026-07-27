import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { logger } from './logger';

/**
 * Cloudinary SDK singleton. Product imagery and brand assets are stored under
 * `env.CLOUDINARY_FOLDER`; Multer streams uploads straight through in Phase 2.
 */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

logger.info(`[cloudinary] Configured for cloud "${env.CLOUDINARY_CLOUD_NAME}"`);

export { cloudinary };
export const CLOUDINARY_FOLDER = env.CLOUDINARY_FOLDER;
