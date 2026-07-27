import { Router } from 'express';
import * as reviews from '../../controllers/review.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { approveReviewSchema, idParamSchema, reviewQuerySchema } from '../../validators';

/**
 * Moderation queue. The handlers are shared with the public review controller;
 * mounting them here means the caller is always staff, so `includePending`
 * resolves to the full list.
 */
const router: Router = Router();

router.get('/', validate({ query: reviewQuerySchema }), asyncHandler(reviews.listReviews));

router.patch(
  '/:id/approval',
  validate({ params: idParamSchema, body: approveReviewSchema }),
  asyncHandler(reviews.setReviewApproval),
);

router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(reviews.deleteReview));

export default router;
