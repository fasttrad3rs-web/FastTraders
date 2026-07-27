import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { imageSchema, jsonTransform, seoSchema } from './shared.schemas';
import { datasheetSchema, specificationSchema, variantSchema } from './Product.subschemas';
import type {
  Datasheet,
  PricingMode,
  ProductImage,
  ProductUnit,
  ProductVariant,
  Seo,
  Specification,
  StockStatus,
} from '../types';

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

  pricingMode: PricingMode;
  price?: number;
  comparePrice?: number;
  /** SERVER-ONLY. `select: false` — must never reach a public response. */
  costPrice?: number;
  taxRate: number;
  currency: 'PKR';

  stock: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  unit: ProductUnit;
  minOrderQty: number;

  images: ProductImage[];
  specifications: Specification[];
  variants: ProductVariant[];
  datasheets: Datasheet[];

  tags: string[];
  warranty?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isActive: boolean;

  ratingAvg: number;
  reviewCount: number;
  viewCount: number;
  salesCount: number;

  seo: Seo;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = HydratedDocument<IProduct>;

const productSchema = new Schema<IProduct>(
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

    /* ------------------------- Hybrid commerce ------------------------- */
    pricingMode: {
      type: String,
      enum: ['retail', 'quote', 'both'],
      required: true,
      default: 'quote',
      index: true,
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      // Required unless the product is quote-only.
      required: [
        function requiredForRetail(this: IProduct): boolean {
          return this.pricingMode !== 'quote';
        },
        'Price is required for retail products',
      ],
    },
    comparePrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0, select: false },
    /** Percentage, e.g. 18 for 18% GST. */
    taxRate: { type: Number, default: 18, min: 0, max: 100 },
    currency: { type: String, enum: ['PKR'], default: 'PKR' },

    /* ------------------------------ Stock ------------------------------ */
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock', 'on_order'],
      default: 'out_of_stock',
      index: true,
    },
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
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
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
productSchema.index({ pricingMode: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ salesCount: -1 });

/* -------------------------------- Hooks --------------------------------- */

/** Derive `stockStatus` from `stock` unless it was set explicitly to `on_order`. */
productSchema.pre('save', function deriveStockStatus(next) {
  if (this.stockStatus === 'on_order' && !this.isModified('stock')) {
    next();
    return;
  }
  if (this.stock <= 0) this.stockStatus = 'out_of_stock';
  else if (this.stock <= this.lowStockThreshold) this.stockStatus = 'low_stock';
  else this.stockStatus = 'in_stock';
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

/* ------------------------------- Virtuals ------------------------------- */

/** True when the product can be added to the Shopping Cart. */
productSchema.virtual('isBuyable').get(function isBuyable(this: ProductDocument): boolean {
  return this.pricingMode !== 'quote' && this.isActive && this.stock > 0;
});

/** True when the product can be added to the Inquiry Cart. */
productSchema.virtual('isQuotable').get(function isQuotable(this: ProductDocument): boolean {
  return this.pricingMode !== 'retail' && this.isActive;
});

productSchema.virtual('discountPercent').get(function discountPercent(
  this: ProductDocument,
): number {
  if (!this.price || !this.comparePrice || this.comparePrice <= this.price) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

export const Product: Model<IProduct> = model<IProduct>('Product', productSchema);
