import { Router } from 'express';
import * as inquiries from '../controllers/inquiry.controller';
import {
  formTiming,
  honeypot,
  inquiryDailyLimiter,
  inquiryLimiter,
  multipartJson,
  uploadSourcingFiles,
  validate,
} from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { createInquirySchema, sourcingInquirySchema } from '../validators';

/**
 * Public inquiry submission. Two routes, both unauthenticated.
 *
 * Order matters: honeypot before validate. A bot that filled the hidden field
 * gets a cheerful 201 without its payload ever being parsed, which is both
 * faster and quieter than letting Zod reject it with a field error that tells
 * the author exactly which input to leave alone next time.
 */
const router: Router = Router();

/** Submitted from the inquiry list. 3 per IP per hour, 10 per day. */
router.post(
  '/',
  inquiryLimiter,
  inquiryDailyLimiter,
  honeypot,
  formTiming,
  validate({ body: createInquirySchema }),
  asyncHandler(inquiries.createProductInquiry),
);

/**
 * Sourcing request for something not in the catalogue. Accepts up to five
 * attachments — usually a phone photo of a nameplate.
 */
/*
 * Middleware order is load-bearing:
 *
 *   inquiryLimiter     cheapest gate first — 3/hour per IP
 *   inquiryDailyLimiter  and 10/day, which stops the slow version
 *   uploadSourcingFiles  Multer parses multipart into req.files + req.body
 *   multipartJson      unpacks the JSON `payload` part into req.body
 *   honeypot           needs a parsed body to see the hidden field
 *   formTiming         same — rejects anything filled in under 3 seconds
 *   validate           Zod, on the same shape either transport produced
 *
 * Multer has to run before anything can read the body, and the honeypot has to
 * run before validation so a caught bot gets a cheerful 201 rather than a
 * field-level error telling it which input to leave alone next time.
 */
router.post(
  '/sourcing',
  inquiryLimiter,
  inquiryDailyLimiter,
  uploadSourcingFiles,
  multipartJson(),
  honeypot,
  formTiming,
  validate({ body: sourcingInquirySchema }),
  asyncHandler(inquiries.createSourcingInquiry),
);

export default router;
