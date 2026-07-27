import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform } from './shared.schemas';

export interface IReview {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  /** Reviews are held for moderation before appearing on the storefront. */
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<IReview>;

const reviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    isApproved: { type: Boolean, default: false, index: true },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
// One review per customer per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });

/* -------------------------------- Hooks --------------------------------- */

/**
 * Keep `Product.ratingAvg` / `reviewCount` denormalised so product cards never
 * need an aggregation. Only approved reviews count.
 */
async function syncProductRating(productId: Types.ObjectId): Promise<void> {
  const Review = model<IReview>('Review');
  const [summary] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await model('Product').findByIdAndUpdate(productId, {
    ratingAvg: Math.round((summary?.avg ?? 0) * 10) / 10,
    reviewCount: summary?.count ?? 0,
  });
}

reviewSchema.post('save', async function afterSave(doc: ReviewDocument) {
  await syncProductRating(doc.product);
});

reviewSchema.post('findOneAndDelete', async function afterDelete(doc: ReviewDocument | null) {
  if (doc) await syncProductRating(doc.product);
});

export const Review: Model<IReview> = model<IReview>('Review', reviewSchema);
