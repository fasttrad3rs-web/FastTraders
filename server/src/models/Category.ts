import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform, seoSchema } from './shared.schemas';
import type { Seo } from '../types';

/** Deepest supported nesting: Switchgear > Circuit Breakers > MCCB. */
export const MAX_CATEGORY_DEPTH = 2;

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parent: Types.ObjectId | null;
  /** Materialised path root -> parent. Enables one-query subtree lookups. */
  ancestors: Types.ObjectId[];
  level: number;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  seo: Seo;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<ICategory>;

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: [true, 'Category name is required'], trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase, hyphen-separated'],
    },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, trim: true },
    /** Lucide icon name rendered in the mega-menu. */
    icon: { type: String, trim: true, maxlength: 60 },

    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    ancestors: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [] },
    level: { type: Number, default: 0, min: 0, max: MAX_CATEGORY_DEPTH, index: true },

    displayOrder: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    seo: { type: seoSchema, default: () => ({ keywords: [] }) },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
categorySchema.index({ parent: 1, displayOrder: 1 });
categorySchema.index({ ancestors: 1 });
categorySchema.index({ isActive: 1, isFeatured: 1, displayOrder: 1 });

/* -------------------------------- Hooks --------------------------------- */

/**
 * Materialise `ancestors` and `level` from the parent chain whenever the
 * parent changes, so breadcrumbs and "all products under X" stay one query.
 */
categorySchema.pre('save', async function materialisePath(next) {
  if (!this.isModified('parent')) {
    next();
    return;
  }

  if (this.parent === null) {
    this.ancestors = [];
    this.level = 0;
    next();
    return;
  }

  const parent = await model<ICategory>('Category').findById(this.parent).select('ancestors level');
  if (!parent) {
    next(new Error('Parent category does not exist'));
    return;
  }
  if (parent.level >= MAX_CATEGORY_DEPTH) {
    next(new Error(`Category nesting cannot exceed ${MAX_CATEGORY_DEPTH + 1} levels`));
    return;
  }

  this.ancestors = [...parent.ancestors, parent._id];
  this.level = parent.level + 1;
  next();
});

/* ------------------------------- Virtuals ------------------------------- */

/** Populate-able child list — used to build the navigation tree. */
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
  options: { sort: { displayOrder: 1 } },
});

categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

export const Category: Model<ICategory> = model<ICategory>('Category', categorySchema);
