import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { ContactSource, ContactStatus } from '../types';

/** Messages from the contact form, product pages and the footer. */
export interface IContact {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: ContactSource;
  status: ContactStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactDocument = HydratedDocument<IContact>;

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    phone: { type: String, trim: true, maxlength: 24 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    source: {
      type: String,
      enum: ['contact_form', 'product_page', 'whatsapp', 'phone', 'footer'],
      default: 'contact_form',
      index: true,
    },
    status: { type: String, enum: ['new', 'read', 'responded'], default: 'new', index: true },
    respondedAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1, createdAt: -1 });

/** Stamp the response time automatically. */
contactSchema.pre('save', function stampResponse(next) {
  if (this.isModified('status') && this.status === 'responded' && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  next();
});

export const Contact: Model<IContact> = model<IContact>('Contact', contactSchema);
