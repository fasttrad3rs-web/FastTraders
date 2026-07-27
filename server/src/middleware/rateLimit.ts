import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env, isTest } from '../config/env';

/**
 * Rate limiters. Behind a proxy (Railway/Render/Vercel) `trust proxy` must be
 * enabled on the app so the real client IP is used as the key.
 */

const shared = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Never throttle the test suite.
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    data: null,
  },
};

/** Applied to every `/api` route. */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/**
 * Strict limiter for credential endpoints: 5 attempts per IP per 15 minutes.
 * Successful requests are not counted, so a legitimate user who logs in on the
 * first try never burns quota.
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    data: null,
  },
});

/**
 * Password-reset and email-verification dispatch. Keyed per IP; 3 per hour is
 * plenty for a real user and stops the SMTP account being used as a relay.
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: {
    success: false,
    message: 'Too many reset requests. Please try again in an hour.',
    data: null,
  },
});

/** Limiter for public write endpoints (contact form, RFQ submission). */
export const publicWriteLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.',
    data: null,
  },
});
