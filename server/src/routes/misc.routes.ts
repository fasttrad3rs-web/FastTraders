import { Router } from 'express';
import * as misc from '../controllers/misc.controller';
import {
  formTiming,
  honeypot,
  publicWriteDailyLimiter,
  publicWriteLimiter,
  validate,
} from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { issueFormToken } from '../utils/form-token';
import { sendSuccess } from '../utils/ApiResponse';
import { bannerQuerySchema, contactSchema, newsletterSchema } from '../validators';

/**
 * Small public endpoints that do not warrant a router each.
 *
 * The contact form and the newsletter box carry the same spam stack as the
 * inquiry routes. They had been left with only a rate limiter — an oversight
 * worth naming, because a spam bot does not care which of the four forms it
 * found, and the newsletter box is the easiest of them to walk into.
 */

export const contactRouter: Router = Router();
contactRouter.post(
  '/',
  publicWriteLimiter,
  publicWriteDailyLimiter,
  honeypot,
  formTiming,
  validate({ body: contactSchema }),
  asyncHandler(misc.submitContact),
);

export const newsletterRouter: Router = Router();
newsletterRouter.post(
  '/',
  publicWriteLimiter,
  publicWriteDailyLimiter,
  honeypot,
  formTiming,
  validate({ body: newsletterSchema }),
  asyncHandler(misc.subscribeNewsletter),
);

/**
 * Mints the signed timestamp the public forms send back on submit.
 *
 * Deliberately unauthenticated and unlimited: it hands out nothing secret, and
 * rate-limiting it would only break the legitimate case where somebody opens
 * three product pages in three tabs.
 */
export const formTokenRouter: Router = Router();
formTokenRouter.get('/', (_req, res) => {
  sendSuccess(res, { formToken: issueFormToken() }, 'Form token issued');
});

export const settingsRouter: Router = Router();
settingsRouter.get('/', asyncHandler(misc.getSettings));

export const bannerRouter: Router = Router();
bannerRouter.get('/', validate({ query: bannerQuerySchema }), asyncHandler(misc.listBanners));
