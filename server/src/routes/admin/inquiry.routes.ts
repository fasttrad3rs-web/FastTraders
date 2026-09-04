import { Router } from 'express';
import * as inquiries from '../../controllers/admin/inquiry.controller';
import { exportInquiries } from '../../controllers/admin/inquiry-export.controller';
import { restrictTo, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  addFollowUpSchema,
  adminInquiryQuerySchema,
  bulkInquirySchema,
  idParamSchema,
  inquiryExportQuerySchema,
  updateInquirySchema,
} from '../../validators';

/** `/api/v1/admin/inquiries` — the screen this business is actually run from. */
const router: Router = Router();

/** `/export` before `/:id`, or "export" is parsed as an id. */
router.get(
  '/export',
  validate({ query: inquiryExportQuerySchema }),
  asyncHandler(exportInquiries),
);

router.get('/', validate({ query: adminInquiryQuerySchema }), asyncHandler(inquiries.listInquiries));

/** `/bulk` before `/:id`, for the same reason as `/export`. */
router.patch(
  '/bulk',
  validate({ body: bulkInquirySchema }),
  asyncHandler(inquiries.bulkUpdateInquiries),
);

router.get('/:id', validate({ params: idParamSchema }), asyncHandler(inquiries.getInquiry));

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateInquirySchema }),
  asyncHandler(inquiries.updateInquiry),
);

router.post(
  '/:id/follow-ups',
  validate({ params: idParamSchema, body: addFollowUpSchema }),
  asyncHandler(inquiries.addFollowUp),
);

/** Deleting a lead loses the follow-up trail with it, so admin only. */
router.delete(
  '/:id',
  restrictTo('admin'),
  validate({ params: idParamSchema }),
  asyncHandler(inquiries.deleteInquiry),
);

export default router;
