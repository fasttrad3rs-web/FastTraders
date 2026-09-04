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
 * Inquiry submission: 3 per IP per hour.
 *
 * Tight, because every one of these sends Sharjeel an email and lands on a
 * screen he works by hand — a flood is not just noise, it buries the real
 * leads. Three is generous for a genuine buyer, who sends one. A shared
 * office NAT could in principle hit it; the message says to phone, which is
 * the channel this business prefers anyway.
 */
export const inquiryLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: {
    success: false,
    message:
      'You have sent several inquiries in the last hour. Please call +92 324 4234990 if it is urgent.',
    data: null,
  },
});

/** Limiter for other public writes (contact form, newsletter). */
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

/**
 * Daily ceiling on inquiries: 10 per IP per 24 hours.
 *
 * The hourly limiter stops a burst; this stops the patient version of the same
 * attack — three an hour, all day, which is 72 emails and a buried inbox. The
 * two run together and the tighter one wins, so a genuine buyer sending one
 * inquiry never sees either.
 */
export const inquiryDailyLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message:
      'You have reached the daily limit for online inquiries. Please call +92 324 4234990.',
    data: null,
  },
});

/** The same daily ceiling for the contact form and newsletter sign-ups. */
export const publicWriteDailyLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    message: 'You have reached the daily limit for form submissions. Please call us instead.',
    data: null,
  },
});
