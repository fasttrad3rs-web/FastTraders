import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform } from './shared.schemas';

/**
 * The inquiry list — a shortlist of products a visitor wants priced.
 *
 * Session-only. There are no customer accounts to attach it to, so the guest
 * cookie is the whole identity story and the old user/sessionId XOR guard has
 * gone with it. No prices, no totals, no stock reservation; the only exit is
 * submitting an inquiry, after which the list is cleared.
 *
 * Lists expire after 30 days. Someone who shortlisted four breakers in
 * February and never sent it is not coming back to that list in May.
 */

const GUEST_TTL_DAYS = 30;

export interface IInquiryListItem {
  product: Types.ObjectId;
  qty: number;
  /** "3P, 36 kA, needed by the 20th" — carried onto the inquiry. */
  note?: string;
  addedAt: Date;
}

export interface IInquiryList {
  sessionId: string;
  items: IInquiryListItem[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InquiryListDocument = HydratedDocument<IInquiryList>;

const itemSchema = new Schema<IInquiryListItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
    note: { type: String, trim: true, maxlength: 500 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const inquiryListSchema = new Schema<IInquiryList>(
  {
    sessionId: { type: String, required: true, unique: true, trim: true, index: true },
    items: { type: [itemSchema], default: [] },
    expiresAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/** Mongo reaps expired lists; nothing in the app has to sweep them. */
inquiryListSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Rolling TTL — every touch buys another 30 days. */
inquiryListSchema.pre('save', function refreshTtl(next) {
  this.expiresAt = new Date(Date.now() + GUEST_TTL_DAYS * 86_400_000);
  next();
});

inquiryListSchema.virtual('itemCount').get(function itemCount(this: InquiryListDocument): number {
  return this.items.reduce((sum, item) => sum + item.qty, 0);
});

export const InquiryList: Model<IInquiryList> = model<IInquiryList>(
  'InquiryList',
  inquiryListSchema,
);
