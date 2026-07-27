import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { BannerPosition } from '../types';

export interface IBanner {
  title: string;
  subtitle?: string;
  image: string;
  /** Portrait crop served to phones — Pakistan traffic is mobile-heavy. */
  mobileImage?: string;
  link?: string;
  ctaText?: string;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BannerDocument = HydratedDocument<IBanner>;

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, trim: true, maxlength: 300 },
    image: { type: String, required: true, trim: true },
    mobileImage: { type: String, trim: true },
    link: { type: String, trim: true },
    ctaText: { type: String, trim: true, maxlength: 40 },
    position: {
      type: String,
      enum: ['hero', 'strip', 'sidebar'],
      default: 'hero',
      index: true,
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

bannerSchema.index({ position: 1, isActive: 1, displayOrder: 1 });

/** True when the banner should render right now. */
bannerSchema.virtual('isLive').get(function isLive(this: BannerDocument): boolean {
  const now = Date.now();
  const started = !this.startsAt || this.startsAt.getTime() <= now;
  const notEnded = !this.endsAt || this.endsAt.getTime() >= now;
  return this.isActive && started && notEnded;
});

export const Banner: Model<IBanner> = model<IBanner>('Banner', bannerSchema);
