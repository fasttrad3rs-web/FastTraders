import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { jsonTransform } from './shared.schemas';

export interface INewsletterSubscriber {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

export type NewsletterDocument = HydratedDocument<INewsletterSubscriber>;

const newsletterSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    isActive: { type: Boolean, default: true, index: true },
    subscribedAt: { type: Date, default: Date.now },
    unsubscribedAt: { type: Date },
  },
  { versionKey: false, toJSON: jsonTransform, toObject: jsonTransform },
);

/** Record when someone opts out, so re-subscribes are distinguishable. */
newsletterSchema.pre('save', function stampUnsubscribe(next) {
  if (this.isModified('isActive')) {
    if (this.isActive) this.unsubscribedAt = undefined;
    else this.unsubscribedAt ??= new Date();
  }
  next();
});

export const Newsletter: Model<INewsletterSubscriber> = model<INewsletterSubscriber>(
  'Newsletter',
  newsletterSchema,
);
