import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform } from './shared.schemas';

/**
 * Admin-managed testimonial.
 *
 * Replaces the customer review model. With no customer accounts there is no
 * way to verify a reviewer, so quotes are entered by staff from real
 * correspondence rather than accepted from the public.
 */
export interface ITestimonial {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  /** Optionally pinned to a product page. */
  product: Types.ObjectId | null;
  rating?: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TestimonialDocument = HydratedDocument<ITestimonial>;

const testimonialSchema = new Schema<ITestimonial>(
  {
    quote: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 160 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    rating: { type: Number, min: 1, max: 5 },
    isPublished: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

testimonialSchema.index({ isPublished: 1, displayOrder: 1 });

export const Testimonial: Model<ITestimonial> = model<ITestimonial>('Testimonial', testimonialSchema);
