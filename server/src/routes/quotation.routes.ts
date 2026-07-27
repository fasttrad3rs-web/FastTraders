import { Router } from 'express';
import * as quotations from '../controllers/quotation.controller';
import { optionalAuth, protect, publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createQuotationSchema,
  idParamSchema,
  myQuotationsQuerySchema,
  quoteNumberParamSchema,
  respondQuotationSchema,
} from '../validators';

const router: Router = Router();

/** Guest RFQs are the norm in this trade, so authentication is optional. */
router.post(
  '/',
  optionalAuth,
  publicWriteLimiter,
  validate({ body: createQuotationSchema }),
  asyncHandler(quotations.createQuotation),
);

router.get(
  '/my',
  protect,
  validate({ query: myQuotationsQuerySchema }),
  asyncHandler(quotations.listMyQuotations),
);

router.post(
  '/:id/respond',
  protect,
  validate({ params: idParamSchema, body: respondQuotationSchema }),
  asyncHandler(quotations.respondToQuotation),
);

router.get(
  '/:quoteNumber',
  optionalAuth,
  validate({ params: quoteNumberParamSchema }),
  asyncHandler(quotations.getQuotation),
);

export default router;
