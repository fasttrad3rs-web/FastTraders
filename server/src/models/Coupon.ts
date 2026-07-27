import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { CouponType } from '../types';

export interface ICoupon {
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  /** Caps the rupee discount on percentage coupons. */
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CouponDocument = HydratedDocument<ICoupon>;

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      match: [/^[A-Z0-9_-]+$/, 'Coupon codes may contain letters, digits, hyphens and underscores'],
    },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function validateValue(this: ICoupon, value: number): boolean {
          return this.type === 'percent' ? value <= 100 : true;
        },
        message: 'A percentage discount cannot exceed 100',
      },
    },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, required: true, default: Date.now },
    validTo: {
      type: Date,
      required: true,
      validate: {
        validator: function validateWindow(this: ICoupon, value: Date): boolean {
          return value > this.validFrom;
        },
        message: 'validTo must be after validFrom',
      },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

couponSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });

/** True when the coupon may be applied right now. */
couponSchema.virtual('isRedeemable').get(function isRedeemable(this: CouponDocument): boolean {
  const now = Date.now();
  const withinWindow = this.validFrom.getTime() <= now && this.validTo.getTime() >= now;
  const underLimit = this.usageLimit === undefined || this.usedCount < this.usageLimit;
  return this.isActive && withinWindow && underLimit;
});

export const Coupon: Model<ICoupon> = model<ICoupon>('Coupon', couponSchema);
