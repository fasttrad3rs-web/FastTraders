import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Order, Review } from '../models';
import { recordAudit } from '../services/audit.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateReviewInput, UpdateReviewInput } from '../validators';

/** Product reviews. Anyone can read approved ones; posting requires an account. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

/** True when this customer has a delivered order containing the product. */
async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const order = await Order.exists({
    user: new Types.ObjectId(userId),
    orderStatus: 'delivered',
    'items.product': new Types.ObjectId(productId),
  });
  return order !== null;
}

export async function listReviews(req: Request, res: Response): Promise<void> {
  const { page, limit, product, includePending, sort } = req.query as unknown as {
    page: number;
    limit: number;
    product?: string;
    includePending: boolean;
    sort: string;
  };

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const filter = {
    ...(product ? { product: new Types.ObjectId(product) } : {}),
    // Only staff may see unmoderated reviews.
    ...(includePending && isStaff ? {} : { isApproved: true }),
  };

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'user', select: 'name' })
      .sort(SORTS[sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} review(s)`);
}

export async function createReview(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateReviewInput;
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  if (await Review.exists({ product: input.product, user: userId })) {
    throw ApiError.conflict('You have already reviewed this product');
  }

  const review = await Review.create({
    ...input,
    user: new Types.ObjectId(userId),
    product: new Types.ObjectId(input.product),
    isVerifiedPurchase: await hasPurchased(userId, input.product),
    // Held for moderation; the post-save hook only counts approved reviews.
    isApproved: false,
  });

  sendCreated(res, review.toJSON(), 'Thank you — your review will appear once approved');
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateReviewInput;

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');
  if (review.user.toString() !== req.user?.id) {
    throw ApiError.forbidden('You can only edit your own review');
  }

  Object.assign(review, input);
  // An edit sends the review back through moderation.
  review.isApproved = false;
  await review.save();

  sendSuccess(res, review.toJSON(), 'Review updated and resubmitted for approval');
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  if (!isStaff && review.user.toString() !== req.user?.id) {
    throw ApiError.forbidden('You can only delete your own review');
  }

  // findOneAndDelete (not deleteOne) so the rating-recalculation hook fires.
  await Review.findOneAndDelete({ _id: review._id });

  if (isStaff) {
    recordAudit({ req, action: 'delete', entity: 'Review', entityId: id });
  }

  sendSuccess(res, null, 'Review deleted');
}

/** Moderation — admin and manager only. */
export async function setReviewApproval(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isApproved } = req.body as { isApproved: boolean };

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');

  const before = review.isApproved;
  review.isApproved = isApproved;
  await review.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Review',
    entityId: id,
    before: { isApproved: before },
    after: { isApproved },
  });

  sendSuccess(res, review.toJSON(), isApproved ? 'Review approved' : 'Review unpublished');
}
