import { Router } from 'express';
import * as misc from '../controllers/misc.controller';
import { publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { bannerQuerySchema, contactSchema, newsletterSchema } from '../validators';

/** Small public endpoints that do not warrant a router each. */

export const contactRouter: Router = Router();
contactRouter.post(
  '/',
  publicWriteLimiter,
  validate({ body: contactSchema }),
  asyncHandler(misc.submitContact),
);

export const newsletterRouter: Router = Router();
newsletterRouter.post(
  '/',
  publicWriteLimiter,
  validate({ body: newsletterSchema }),
  asyncHandler(misc.subscribeNewsletter),
);

export const settingsRouter: Router = Router();
settingsRouter.get('/', asyncHandler(misc.getSettings));

export const bannerRouter: Router = Router();
bannerRouter.get('/', validate({ query: bannerQuerySchema }), asyncHandler(misc.listBanners));
