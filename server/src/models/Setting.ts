import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { BusinessHours, ShippingRule, SocialLinks } from '../types';

/**
 * Site-wide configuration. Enforced singleton: exactly one document with
 * `key: 'global'`, guaranteed by the unique index plus `getSettings()`.
 */

export interface IBankDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
}

export interface ISetting {
  key: 'global';
  storeName: string;
  tagline: string;
  logo?: string;
  email: string;
  phone: string;
  landline?: string;
  whatsapp?: string;
  address: string;
  mapEmbedUrl?: string;
  social: SocialLinks;
  businessHours: BusinessHours[];
  shippingRules: ShippingRule[];
  /** Default sales-tax percentage, e.g. 18 for 18% GST. */
  defaultTaxRate: number;
  currency: 'PKR';
  announcement: { text?: string; link?: string; isActive: boolean };
  bankDetails?: IBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

export type SettingDocument = HydratedDocument<ISetting>;

const businessHoursSchema = new Schema<BusinessHours>(
  {
    days: { type: String, required: true, trim: true },
    open: { type: String, required: true, trim: true },
    close: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const shippingRuleSchema = new Schema<ShippingRule>(
  {
    label: { type: String, required: true, trim: true },
    /** Matches the shipping city; `*` is the catch-all rule. */
    city: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    freeAbove: { type: Number, min: 0 },
    etaDays: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, enum: ['global'], default: 'global', unique: true, immutable: true },
    storeName: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    logo: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    landline: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    mapEmbedUrl: { type: String, trim: true },
    social: {
      type: new Schema<SocialLinks>(
        {
          facebook: { type: String, trim: true },
          instagram: { type: String, trim: true },
          linkedin: { type: String, trim: true },
          youtube: { type: String, trim: true },
          whatsapp: { type: String, trim: true },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    businessHours: { type: [businessHoursSchema], default: [] },
    shippingRules: { type: [shippingRuleSchema], default: [] },
    defaultTaxRate: { type: Number, default: 18, min: 0, max: 100 },
    currency: { type: String, enum: ['PKR'], default: 'PKR' },
    announcement: {
      type: new Schema(
        {
          text: { type: String, trim: true, maxlength: 200 },
          link: { type: String, trim: true },
          isActive: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({ isActive: false }),
    },
    bankDetails: {
      type: new Schema<IBankDetails>(
        {
          bankName: { type: String, required: true, trim: true },
          accountTitle: { type: String, required: true, trim: true },
          accountNumber: { type: String, required: true, trim: true },
          iban: { type: String, trim: true, uppercase: true },
        },
        { _id: false },
      ),
    },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

export const Setting: Model<ISetting> = model<ISetting>('Setting', settingSchema);
