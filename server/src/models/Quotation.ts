import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { nextDocumentNumber } from './Counter';
import { customerDetailsSchema, fileSchema, jsonTransform } from './shared.schemas';
import type { Attachment, CustomerDetails, ProductUnit, QuotationStatus } from '../types';

/**
 * Quotation = the RFQ / bulk-inquiry side of the hybrid model.
 * Flow: customer submits Inquiry Cart -> admin prices each line ->
 * customer accepts -> admin converts to an Order (`convertedOrder`).
 */

export interface IQuotationItem {
  product: Types.ObjectId;
  name: string;
  sku: string;
  qty: number;
  unit: ProductUnit;
  /** What the buyer asked for on this line (rating, length, urgency...). */
  customerNote?: string;
  /** Filled in by an admin when pricing the quote. */
  quotedUnitPrice?: number;
  quotedTotal?: number;
}

export interface IQuotation {
  quoteNumber: string;
  user: Types.ObjectId | null;
  customer: CustomerDetails;
  items: IQuotationItem[];
  message?: string;
  requiredBy?: Date;

  status: QuotationStatus;
  quotedSubtotal?: number;
  quotedTax?: number;
  quotedTotal?: number;
  validUntil?: Date;
  adminNotes?: string;
  attachments: Attachment[];

  convertedOrder: Types.ObjectId | null;
  assignedTo: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationDocument = HydratedDocument<IQuotation>;

const QUOTATION_STATUSES: QuotationStatus[] = [
  'new',
  'reviewing',
  'quoted',
  'negotiating',
  'accepted',
  'rejected',
  'expired',
  'converted',
];

const quotationItemSchema = new Schema<IQuotationItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: String, enum: ['piece', 'meter', 'roll', 'box', 'set'], default: 'piece' },
    customerNote: { type: String, trim: true, maxlength: 500 },
    quotedUnitPrice: { type: Number, min: 0 },
    quotedTotal: { type: Number, min: 0 },
  },
  { _id: false },
);

const quotationSchema = new Schema<IQuotation>(
  {
    quoteNumber: { type: String, unique: true, index: true },
    /** Null for guest RFQs — most trade enquiries arrive without an account. */
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customer: { type: customerDetailsSchema, required: true },
    items: {
      type: [quotationItemSchema],
      validate: [(items: IQuotationItem[]) => items.length > 0, 'An RFQ needs at least one item'],
    },
    message: { type: String, trim: true, maxlength: 2000 },
    /** Buyer's required-by date — drives admin prioritisation. */
    requiredBy: { type: Date },

    status: { type: String, enum: QUOTATION_STATUSES, default: 'new', index: true },
    quotedSubtotal: { type: Number, min: 0 },
    quotedTax: { type: Number, min: 0 },
    quotedTotal: { type: Number, min: 0 },
    validUntil: { type: Date },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
    attachments: { type: [fileSchema], default: [] },

    convertedOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ user: 1, createdAt: -1 });
quotationSchema.index({ 'customer.email': 1, createdAt: -1 });
quotationSchema.index({ assignedTo: 1, status: 1 });
quotationSchema.index({ validUntil: 1 });

/* -------------------------------- Hooks --------------------------------- */

/** Assign FTQ-YYYYMM-0001. */
quotationSchema.pre('validate', async function assignQuoteNumber(next) {
  if (this.isNew && !this.quoteNumber) {
    this.quoteNumber = await nextDocumentNumber('quotation', 'FTQ');
  }
  next();
});

/** Recompute quoted totals from the priced lines. */
quotationSchema.pre('save', function recalculateQuote(next) {
  const priced = this.items.filter((item) => typeof item.quotedUnitPrice === 'number');

  if (priced.length === 0) {
    next();
    return;
  }

  priced.forEach((item) => {
    item.quotedTotal = Math.round((item.quotedUnitPrice ?? 0) * item.qty * 100) / 100;
  });

  this.quotedSubtotal = priced.reduce((sum, item) => sum + (item.quotedTotal ?? 0), 0);
  this.quotedTotal = Math.round((this.quotedSubtotal + (this.quotedTax ?? 0)) * 100) / 100;
  next();
});

/** A quote is only "quoted" once every line carries a price. */
quotationSchema.virtual('isFullyPriced').get(function isFullyPriced(
  this: QuotationDocument,
): boolean {
  return this.items.length > 0 && this.items.every((item) => typeof item.quotedUnitPrice === 'number');
});

quotationSchema.virtual('isExpired').get(function isExpired(this: QuotationDocument): boolean {
  return this.validUntil instanceof Date && this.validUntil.getTime() < Date.now();
});

export const Quotation: Model<IQuotation> = model<IQuotation>('Quotation', quotationSchema);
