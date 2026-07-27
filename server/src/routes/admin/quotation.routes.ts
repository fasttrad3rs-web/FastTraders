import { Router } from 'express';
import * as quotations from '../../controllers/admin/quotation.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminQuotationQuerySchema,
  assignQuotationSchema,
  convertQuotationSchema,
  idParamSchema,
  priceQuotationSchema,
} from '../../validators';

const router: Router = Router();

router.get('/', validate({ query: adminQuotationQuerySchema }), asyncHandler(quotations.listQuotations));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(quotations.getQuotation));

/** Set per-line prices, validity and notes. */
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: priceQuotationSchema }),
  asyncHandler(quotations.priceQuotation),
);

router.get(
  '/:id/pdf',
  validate({ params: idParamSchema }),
  asyncHandler(quotations.downloadQuotationPdf),
);

/** Emails the formal PDF quotation to the customer. */
router.post('/:id/send', validate({ params: idParamSchema }), asyncHandler(quotations.sendQuotation));

router.post(
  '/:id/convert',
  validate({ params: idParamSchema, body: convertQuotationSchema }),
  asyncHandler(quotations.convertQuotation),
);

router.patch(
  '/:id/assign',
  validate({ params: idParamSchema, body: assignQuotationSchema }),
  asyncHandler(quotations.assignQuotation),
);

export default router;
