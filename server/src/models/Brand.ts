import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';

export interface IBrand {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  /** Country of origin, shown on the brand page (e.g. "Japan"). */
  country?: string;
  website?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BrandDocument = HydratedDocument<IBrand>;

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: [true, 'Brand name is required'], trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen-separated'],
    },
    logo: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    country: { type: String, trim: true, maxlength: 60 },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/i, 'Website must be a valid URL'],
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
brandSchema.index({ isActive: 1, displayOrder: 1 });
brandSchema.index({ name: 'text' });

brandSchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'brand',
  count: true,
});

export const Brand: Model<IBrand> = model<IBrand>('Brand', brandSchema);
