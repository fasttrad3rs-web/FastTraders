import { Router } from 'express';
import * as reviews from '../controllers/review.controller';
import { optionalAuth, protect, restrictTo, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  approveReviewSchema,
  createReviewSchema,
  idParamSchema,
  reviewQuerySchema,
  updateReviewSchema,
} from '../validators';

const router: Router = Router();

/** Public read — only approved reviews unless a staff member asks. */
router.get(
  '/',
  optionalAuth,
  validate({ query: reviewQuerySchema }),
  asyncHandler(reviews.listReviews),
);

router.post(
  '/',
  protect,
  validate({ body: createReviewSchema }),
  asyncHandler(reviews.createReview),
);

router.patch(
  '/:id',
  protect,
  validate({ params: idParamSchema, body: updateReviewSchema }),
  asyncHandler(reviews.updateReview),
);

router.delete(
  '/:id',
  protect,
  validate({ params: idParamSchema }),
  asyncHandler(reviews.deleteReview),
);

/** Moderation. */
router.patch(
  '/:id/approval',
  protect,
  restrictTo('admin', 'manager'),
  validate({ params: idParamSchema, body: approveReviewSchema }),
  asyncHandler(reviews.setReviewApproval),
);

export default router;
