import { Schema } from 'mongoose';
import type { Seo } from '../types';

/**
 * Reusable subdocument schemas.
 * `_id: false` everywhere — these are value objects, not entities.
 */

export const seoSchema = new Schema<Seo>(
  {
    title: { type: String, trim: true, maxlength: 70 },
    description: { type: String, trim: true, maxlength: 180 },
    keywords: { type: [String], default: [] },
  },
  { _id: false },
);

/** A Cloudinary-backed image reference. */
export const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    alt: { type: String, required: true, trim: true, maxlength: 160 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

/** A Cloudinary-backed file reference (datasheets, RFQ attachments). */
export const fileSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false },
);

/** Contact block captured on an RFQ. Every enquirer is a guest. */
export const customerDetailsSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    companyName: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false },
);

/**
 * Shared JSON transform: expose `id`, hide `_id`/`__v`.
 * Applied via `schema.set('toJSON', jsonTransform)`.
 */
export const jsonTransform = {
  virtuals: true,
  versionKey: false,
  transform(_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> {
    delete ret._id;
    return ret;
  },
} as const;
