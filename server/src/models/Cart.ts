import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { jsonTransform } from './shared.schemas';
import type { CartType } from '../types';

/**
 * Server-persisted cart.
 *
 * Both carts of the hybrid model live in this one collection, separated by the
 * `type` discriminator:
 *   - `shopping` -> checkout -> Order
 *   - `inquiry`  -> RFQ form -> Quotation
 *
 * A cart belongs to either a logged-in `user` or an anonymous `sessionId`.
 * Guest carts self-destruct after 30 days via a TTL index.
 */

const GUEST_CART_TTL_DAYS = 30;

export interface ICartItem {
  product: Types.ObjectId;
  qty: number;
  variant?: string;
  /** Unit price snapshot at add-to-cart time (shopping cart only). */
  priceAtAdd?: number;
  /** Buyer note carried through to the RFQ (inquiry cart only). */
  note?: string;
  addedAt: Date;
}

export interface ICart {
  type: CartType;
  user: Types.ObjectId | null;
  sessionId: string | null;
  items: ICartItem[];
  /** Only set on guest carts; drives the TTL index. */
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CartDocument = HydratedDocument<ICart>;

const cartItemSchema = new Schema<ICartItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
    variant: { type: String, trim: true },
    priceAtAdd: { type: Number, min: 0 },
    note: { type: String, trim: true, maxlength: 500 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    type: { type: String, enum: ['shopping', 'inquiry'], required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null, trim: true },
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */

// One cart of each type per user, and one per guest session.
// `partialFilterExpression` keeps the nulls from colliding.
cartSchema.index(
  { user: 1, type: 1 },
  { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } },
);
cartSchema.index(
  { sessionId: 1, type: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: 'string' } } },
);
// TTL: Mongo removes the document once `expiresAt` passes.
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* -------------------------------- Hooks --------------------------------- */

/** A cart must be owned by exactly one of user / sessionId. */
cartSchema.pre('validate', function requireOwner(next) {
  const hasUser = this.user !== null && this.user !== undefined;
  const hasSession = typeof this.sessionId === 'string' && this.sessionId.length > 0;

  if (hasUser === hasSession) {
    next(new Error('A cart must belong to either a user or a sessionId, not both or neither'));
    return;
  }

  // Refresh the guest TTL on every write; clear it once the cart is claimed.
  if (hasSession) {
    this.expiresAt = new Date(Date.now() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000);
  } else {
    this.expiresAt = undefined;
  }
  next();
});

cartSchema.virtual('itemCount').get(function itemCount(this: CartDocument): number {
  return this.items.reduce((sum, item) => sum + item.qty, 0);
});

export const Cart: Model<ICart> = model<ICart>('Cart', cartSchema);
