import { Schema } from 'mongoose';
import type { Datasheet, ProductVariant, Specification } from '../types';

/**
 * Server-side variant.
 *
 * The shared `ProductVariant` is the *public* shape: no price, no stock.
 * Staff need both to quote and to pick, so they are added back here and
 * stripped again by `toPublicProduct`.
 */
export interface ProductVariantRecord extends ProductVariant {
  price?: number;
  stock: number;
}

/**
 * Product subdocument schemas, split out to keep `Product.ts` readable.
 * All are value objects — no `_id`.
 */

/**
 * A single technical attribute.
 * e.g. { group: 'Electrical', key: 'Rated Current', value: '100 A' }
 */
export const specificationSchema = new Schema<Specification>(
  {
    key: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
    /** Section header in the spec table, e.g. "Electrical" / "Mechanical". */
    group: { type: String, trim: true, maxlength: 60 },
  },
  { _id: false },
);

/**
 * A variation (pole count, current rating, cable size, ...).
 *
 * `price` is internal, like the parent product's. `select: false` on an
 * embedded path is easy to overlook — the parent's guard does not reach into
 * the array — so it is declared again here. `stock` is left selectable and
 * simply omitted from the public whitelist.
 */
export const variantSchema = new Schema<ProductVariantRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    attributes: {
      type: Map,
      of: String,
      default: (): Map<string, string> => new Map<string, string>(),
    },
    price: { type: Number, min: 0, select: false },
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, trim: true },
  },
  { _id: false },
);

/** A downloadable PDF datasheet / catalogue page hosted on Cloudinary. */
export const datasheetSchema = new Schema<Datasheet>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false },
);
