import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { nextDocumentNumber } from './Counter';
import { jsonTransform } from './shared.schemas';
import { normalisePakistaniPhone } from '../utils/phone';
import type {
  ContactMethod,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
  InquiryType,
  ProductUnit,
  Urgency,
} from '../types';

/**
 * Inquiry — the core record. Everything else in the system exists to produce
 * one of these or to work it.
 *
 * It replaces the old Quotation, and the difference is the point: there are
 * no priced lines, no subtotal, no validity window and no accept/reject
 * endpoint. Fast Traders quotes on the phone or on WhatsApp. What the system
 * keeps is who asked, for what, and what happened next — the follow-up trail,
 * not a document. `internalQuotedAmount` is the one figure, admin-only, so
 * the pipeline has something to total.
 */

const UNITS: ProductUnit[] = ['piece', 'meter', 'roll', 'box', 'set'];

export const INQUIRY_TYPES: InquiryType[] = ['product_inquiry', 'sourcing_request', 'general'];

export const INQUIRY_STATUSES: InquiryStatus[] = [
  'new',
  'contacted',
  'quoted_verbally',
  'negotiating',
  'won',
  'lost',
  'no_response',
];

export const INQUIRY_PRIORITIES: InquiryPriority[] = ['low', 'normal', 'high'];
export const INQUIRY_SOURCES: InquirySource[] = ['website', 'whatsapp', 'phone', 'walk_in'];
export const CONTACT_METHODS: ContactMethod[] = ['phone', 'whatsapp', 'email'];
export const URGENCIES: Urgency[] = ['standard', 'urgent'];

/* ------------------------------ Subdocuments ----------------------------- */

export interface IInquiryCustomer {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  city?: string;
  designation?: string;
}

export interface IInquiryItem {
  product: Types.ObjectId;
  name: string;
  sku: string;
  brand?: string;
  qty: number;
  unit: ProductUnit;
  note?: string;
}

export interface IReferenceFile {
  url: string;
  publicId: string;
  name: string;
  type: string;
}

export interface ISourcingDetails {
  itemDescription: string;
  preferredBrand?: string;
  partNumber?: string;
  specifications?: string;
  quantity?: number;
  unit?: ProductUnit;
  targetDate?: Date;
  urgency?: Urgency;
  isRepeatRequirement?: boolean;
  referenceFiles: IReferenceFile[];
  application?: string;
}

export interface IFollowUp {
  note: string;
  by: Types.ObjectId;
  at: Date;
  nextFollowUpAt?: Date;
}

export interface IInquiry {
  inquiryNumber: string;
  type: InquiryType;
  customer: IInquiryCustomer;
  items: IInquiryItem[];
  sourcingDetails?: ISourcingDetails;
  message?: string;
  preferredContactMethod: ContactMethod;
  preferredContactTime?: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  assignedTo: Types.ObjectId | null;
  followUps: IFollowUp[];
  /** Admin-only. Never projected publicly — there is no public read. */
  internalQuotedAmount?: number;
  lostReason?: string;
  source: InquirySource;
  /** 0 = clean. Non-zero shows a flag in the admin list; nothing is hidden. */
  spamScore: number;
  spamReasons: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InquiryDocument = HydratedDocument<IInquiry>;

/**
 * Phone numbers are normalised by a setter rather than a hook, so the value
 * is already E.164 by the time any validator or index sees it. An
 * unparseable number is left as typed and rejected by the Zod layer — a
 * silent mangle would be worse than a visible error.
 */
const phoneSetter = (value: string): string => normalisePakistaniPhone(value) ?? value;

const customerSchema = new Schema<IInquiryCustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20, set: phoneSetter },
    whatsapp: { type: String, trim: true, maxlength: 20, set: phoneSetter },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    company: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 80 },
    designation: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false },
);

const itemSchema = new Schema<IInquiryItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    // Name, SKU and brand are denormalised on purpose: an inquiry is a record
    // of what was asked for, and renaming a product two years later must not
    // rewrite history.
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    brand: { type: String, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: String, enum: UNITS, default: 'piece' },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const referenceFileSchema = new Schema<IReferenceFile>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const sourcingSchema = new Schema<ISourcingDetails>(
  {
    itemDescription: { type: String, required: true, trim: true, maxlength: 2000 },
    preferredBrand: { type: String, trim: true, maxlength: 120 },
    partNumber: { type: String, trim: true, uppercase: true, maxlength: 120 },
    specifications: { type: String, trim: true, maxlength: 4000 },
    quantity: { type: Number, min: 0 },
    unit: { type: String, enum: UNITS },
    targetDate: { type: Date },
    urgency: { type: String, enum: URGENCIES },
    isRepeatRequirement: { type: Boolean, default: false },
    /** Nameplate photos and spec sheets — usually how a sourcing job starts. */
    referenceFiles: { type: [referenceFileSchema], default: [] },
    application: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const followUpSchema = new Schema<IFollowUp>(
  {
    note: { type: String, required: true, trim: true, maxlength: 2000 },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    nextFollowUpAt: { type: Date },
  },
  { _id: false },
);

/* -------------------------------- Schema --------------------------------- */

const inquirySchema = new Schema<IInquiry>(
  {
    inquiryNumber: { type: String, unique: true, index: true },
    type: { type: String, enum: INQUIRY_TYPES, required: true, index: true },
    customer: { type: customerSchema, required: true },
    items: { type: [itemSchema], default: [] },
    sourcingDetails: { type: sourcingSchema, default: undefined },
    message: { type: String, trim: true, maxlength: 4000 },

    preferredContactMethod: { type: String, enum: CONTACT_METHODS, default: 'phone' },
    /** Free text: "after 5pm", "not during Jummah". */
    preferredContactTime: { type: String, trim: true, maxlength: 120 },

    status: { type: String, enum: INQUIRY_STATUSES, default: 'new', index: true },
    priority: { type: String, enum: INQUIRY_PRIORITIES, default: 'normal', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    followUps: { type: [followUpSchema], default: [] },

    internalQuotedAmount: { type: Number, min: 0 },
    lostReason: { type: String, trim: true, maxlength: 500 },
    source: { type: String, enum: INQUIRY_SOURCES, default: 'website', index: true },

    // Kept for abuse triage. An inquiry form with no login is a spam target,
    // and these are what tell one flood apart from a genuine busy morning.
    ipAddress: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 400 },

    /*
     * Spam heuristics. Scored on the way in, never acted on automatically —
     * see `spam-score.service.ts` for why a flag beats a delete here.
     */
    spamScore: { type: Number, default: 0, min: 0, index: true },
    spamReasons: { type: [String], default: [] },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ type: 1, status: 1 });
inquirySchema.index({ assignedTo: 1, status: 1 });
/** Admin search. Phone is weighted hardest — it is how staff recognise a caller. */
inquirySchema.index(
  { 'customer.name': 'text', 'customer.phone': 'text', 'customer.company': 'text' },
  { name: 'inquiry_search', weights: { 'customer.phone': 10, 'customer.name': 5, 'customer.company': 3 } },
);

/* -------------------------------- Hooks --------------------------------- */

/** Assign FT-INQ-YYYYMM-0001. */
inquirySchema.pre('validate', async function assignInquiryNumber(next) {
  if (this.isNew && !this.inquiryNumber) {
    this.inquiryNumber = await nextDocumentNumber('inquiry', 'FT-INQ');
  }
  next();
});

/**
 * A product inquiry needs items; a sourcing request needs a description.
 * A `general` inquiry needs neither — someone asking whether you stock
 * Terasaki at all is still a lead worth keeping.
 */
inquirySchema.pre('validate', function requireBody(next) {
  if (this.type === 'product_inquiry' && this.items.length === 0) {
    next(new Error('A product inquiry needs at least one item'));
    return;
  }
  if (this.type === 'sourcing_request' && !this.sourcingDetails?.itemDescription) {
    next(new Error('A China sourcing request needs an item description'));
    return;
  }
  next();
});

/** `lost` without a reason is a lead nobody learns anything from. */
inquirySchema.pre('save', function requireLostReason(next) {
  if (this.status === 'lost' && !this.lostReason) {
    next(new Error('Set a reason when marking an inquiry lost'));
    return;
  }
  next();
});

/* ------------------------------- Virtuals ------------------------------- */

/** The next chase date, if one was set on the latest follow-up. */
inquirySchema.virtual('nextFollowUpAt').get(function nextFollowUpAt(
  this: InquiryDocument,
): Date | null {
  const latest = this.followUps.at(-1);
  return latest?.nextFollowUpAt ?? null;
});

inquirySchema.virtual('isOpen').get(function isOpen(this: InquiryDocument): boolean {
  return !['won', 'lost', 'no_response'].includes(this.status);
});

export const Inquiry: Model<IInquiry> = model<IInquiry>('Inquiry', inquirySchema);
