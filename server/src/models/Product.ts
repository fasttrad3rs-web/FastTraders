import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { imageSchema, jsonTransform, seoSchema } from './shared.schemas';
import {
  datasheetSchema,
  specificationSchema,
  variantSchema,
  type ProductVariantRecord,
} from './Product.subschemas';
import { toPublicProduct, type PublicProduct } from './Product.public';
import type { Availability, Datasheet, ProductImage, ProductUnit, Seo, Specification } from '../types';

/**
 * Product — catalogue-only.
 *
 * Nothing here is priced publicly. `lastQuotedPrice`, `internalCost`,
 * `supplierNotes` and `stock` are staff data: they exist so a price can be
 * built and stock can be managed, and the public API reaches them through
 * nothing at all. `toPublicJSON()` is the single gate — see `Product.public.ts`.
 */
export interface IProduct {
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  /** Rich-text HTML from the admin editor. */
  description: string;
  shortDescription?: string;

  category: Types.ObjectId;
  subCategory: Types.ObjectId | null;
  brand: Types.ObjectId;

  /* ------------------------- Internal, admin-only ------------------------ */

  /**
   * What we last quoted this at, in PKR. A memory aid for whoever builds the
   * next call — not a list price, and never published. Prices here move
   * with the dollar and with what the supplier is asking that week, which is
   * exactly why the site does not print them.
   */
  lastQuotedPrice?: number;
  /** What it costs us. */
  internalCost?: number;
  /** Supplier, lead-time caveats, MOQ quirks. Staff eyes only. */
  supplierNotes?: string;
  /** Numeric on-hand count. Public callers get `availability`, not a number. */
  stock: number;
  lowStockThreshold: number;

  /* --------------------------- Public signals ---------------------------- */

  /** What a buyer needs to know instead of a stock figure. */
  availability: Availability;
  /** Free text, e.g. "2-3 days" or "3-4 weeks (imported)". */
  leadTime?: string;
  /** Brought in from abroad rather than held locally. */
  isImportItem: boolean;

  unit: ProductUnit;
  minOrderQty: number;

  images: ProductImage[];
  specifications: Specification[];
  variants: ProductVariantRecord[];
  datasheets: Datasheet[];

  tags: string[];
  warranty?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isActive: boolean;

  viewCount: number;
  salesCount: number;

  seo: Seo;
  createdAt: Date;
  updatedAt: Date;
}

/** Instance methods. */
export interface IProductMethods {
  toPublicJSON(): PublicProduct;
}

export type ProductDocument = HydratedDocument<IProduct, IProductMethods>;
export type ProductModel = Model<IProduct, Record<string, never>, IProductMethods>;

export const AVAILABILITY_VALUES = [
  'ready_stock',
  'available_on_order',
  'import_on_request',
  'discontinued',
] as const;

const productSchema = new Schema<IProduct, ProductModel, IProductMethods>(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen-separated'],
    },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 60 },
    /** Manufacturer part number — the field trade buyers actually search by. */
    partNumber: { type: String, trim: true, uppercase: true, maxlength: 80, index: true },
    description: { type: String, required: true, trim: true, maxlength: 20000 },
    shortDescription: { type: String, trim: true, maxlength: 400 },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },

    /* ----------------------- Internal (admin-only) ---------------------- */
    // `select: false` is defence in depth, not the guard. The guard is
    // `toPublicJSON()`, which whitelists — a projection can be forgotten or
    // overridden, a whitelist cannot leak a field nobody added to it.
    lastQuotedPrice: { type: Number, min: 0, select: false },
    internalCost: { type: Number, min: 0, select: false },
    supplierNotes: { type: String, trim: true, maxlength: 2000, select: false },

    /* ------------------------------ Stock ------------------------------ */
    // Selectable, because the filter and the low-stock report need it and a
    // `select: false` numeric field is a footgun around pre-save hooks. It is
    // simply never in the public whitelist.
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    availability: {
      type: String,
      enum: AVAILABILITY_VALUES,
      default: 'available_on_order',
      index: true,
    },
    leadTime: { type: String, trim: true, maxlength: 80 },
    isImportItem: { type: Boolean, default: false, index: true },

    unit: {
      type: String,
      enum: ['piece', 'meter', 'roll', 'box', 'set'],
      default: 'piece',
    },
    minOrderQty: { type: Number, default: 1, min: 1 },

    /* ------------------------------ Media ------------------------------ */
    images: { type: [imageSchema], default: [] },
    specifications: { type: [specificationSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    datasheets: { type: [datasheetSchema], default: [] },

    /* ---------------------------- Marketing ---------------------------- */
    tags: { type: [String], default: [], index: true },
    warranty: { type: String, trim: true, maxlength: 120 },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },

    /* ----------------------------- Metrics ----------------------------- */
    viewCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },

    seo: { type: seoSchema, default: () => ({ keywords: [] }) },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */

/** Full-text search. `sku` and `partNumber` are weighted hardest — trade
 *  buyers paste part numbers straight into the search box. */
productSchema.index(
  { sku: 'text', partNumber: 'text', name: 'text', tags: 'text', description: 'text' },
  {
    name: 'product_search',
    weights: { sku: 20, partNumber: 20, name: 10, tags: 5, description: 1 },
  },
);

/** Primary catalogue filter path. */
productSchema.index({ category: 1, brand: 1, isActive: 1 });
productSchema.index({ subCategory: 1, isActive: 1 });
productSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ salesCount: -1 });

/* -------------------------------- Hooks --------------------------------- */

/**
 * Availability is an editorial choice, not a computed one — no stock figure
 * can tell you whether something is imported on request or discontinued. The
 * one thing worth automating is the case that would otherwise mislead a
 * buyer: an item advertised as ready stock that has run out.
 */
productSchema.pre('save', function demoteEmptyReadyStock(next) {
  if (this.availability === 'ready_stock' && this.stock <= 0) {
    this.availability = 'available_on_order';
  }
  next();
});

/** Exactly one primary image. */
productSchema.pre('save', function ensurePrimaryImage(next) {
  if (this.images.length > 0 && !this.images.some((image) => image.isPrimary)) {
    const first = this.images[0];
    if (first) first.isPrimary = true;
  }
  next();
});

/** Fall back to the product name/short description for SEO metadata. */
productSchema.pre('save', function fillSeoDefaults(next) {
  this.seo.title ??= `${this.name} | Fast Traders`;
  this.seo.description ??= this.shortDescription ?? this.name;
  next();
});

/* ------------------------------- Methods -------------------------------- */

/**
 * The public shape. Every public controller returns this and only this.
 * Implementation lives in `Product.public.ts` so lean queries — which have no
 * document methods — can share exactly the same whitelist.
 */
productSchema.methods.toPublicJSON = function toPublicJSON(this: ProductDocument): PublicProduct {
  return toPublicProduct(this.toObject({ virtuals: true }));
};

/* ------------------------------- Virtuals ------------------------------- */

/** Everything active is enquirable — there is no other path. */
productSchema.virtual('isEnquirable').get(function isEnquirable(this: ProductDocument): boolean {
  return this.isActive && this.availability !== 'discontinued';
});

productSchema.virtual('testimonials', {
  ref: 'Testimonial',
  localField: '_id',
  foreignField: 'product',
});

export const Product: ProductModel = model<IProduct, ProductModel>('Product', productSchema);
