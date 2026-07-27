import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { nextDocumentNumber } from './Counter';
import { addressSchema, customerDetailsSchema, jsonTransform } from './shared.schemas';
import type {
  CustomerDetails,
  Address,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductUnit,
} from '../types';

/* --------------------------- Document interfaces ------------------------ */

export interface IOrderItem {
  product: Types.ObjectId;
  /** Denormalised so order history survives catalogue edits and deletions. */
  name: string;
  sku: string;
  image?: string;
  price: number;
  qty: number;
  unit: ProductUnit;
  variant?: string;
  subtotal: number;
}

export interface IPaymentProof {
  url: string;
  publicId: string;
  uploadedAt: Date;
  /** Set by an admin once the transfer is confirmed against the bank statement. */
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
}

export interface IPaymentDetails {
  transactionId?: string;
  provider?: string;
  paidAt?: Date;
  receiptUrl?: string;
  /** Gateway reference (Stripe PaymentIntent id, JazzCash txn ref). */
  reference?: string;
  /** Customer-uploaded bank transfer slip. */
  proof?: IPaymentProof;
  /** Webhook event ids already applied — makes replays idempotent. */
  processedEvents?: string[];
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  changedBy?: Types.ObjectId;
  at: Date;
}

export interface IOrder {
  orderNumber: string;
  user: Types.ObjectId | null;
  items: IOrderItem[];
  customer: CustomerDetails;
  shippingAddress: Address;
  billingAddress: Address;
  sameAsBilling: boolean;

  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails: IPaymentDetails;

  orderStatus: OrderStatus;
  statusHistory: IStatusHistoryEntry[];

  trackingNumber?: string;
  courier?: string;
  notes?: string;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<IOrder>;

/* ------------------------------ Subschemas ------------------------------ */

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    image: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: String, enum: ['piece', 'meter', 'roll', 'box', 'set'], default: 'piece' },
    variant: { type: String, trim: true },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paymentProofSchema = new Schema<IPaymentProof>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const paymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    transactionId: { type: String, trim: true },
    provider: { type: String, trim: true },
    paidAt: { type: Date },
    receiptUrl: { type: String, trim: true },
    reference: { type: String, trim: true, index: true },
    proof: { type: paymentProofSchema },
    // Capped in the controller; an unbounded array would grow forever.
    processedEvents: { type: [String], default: [] },
  },
  { _id: false },
);

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

/* -------------------------------- Schema -------------------------------- */

const orderSchema = new Schema<IOrder>(
  {
    // Assigned by the pre-validate hook below.
    orderNumber: { type: String, unique: true, index: true },
    /** Null for guest checkout. */
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: {
      type: [orderItemSchema],
      validate: [(items: IOrderItem[]) => items.length > 0, 'An order needs at least one item'],
    },
    customer: { type: customerDetailsSchema, required: true },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },
    sameAsBilling: { type: Boolean, default: true },

    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    total: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa'],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentDetails: { type: paymentDetailsSchema, default: () => ({}) },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    trackingNumber: { type: String, trim: true },
    courier: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    invoiceUrl: { type: String, trim: true },
  },
  { timestamps: true, toJSON: jsonTransform, toObject: jsonTransform },
);

/* ------------------------------- Indexes -------------------------------- */
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });
orderSchema.index({ 'customer.email': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

/* -------------------------------- Hooks --------------------------------- */

/** Assign FT-YYYYMM-0001 and open the status history. */
orderSchema.pre('validate', async function assignOrderNumber(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await nextDocumentNumber('order', 'FT');
    if (this.statusHistory.length === 0) {
      this.statusHistory.push({ status: this.orderStatus, note: 'Order placed', at: new Date() });
    }
  }
  next();
});

/** Recompute money fields from the line items — never trust the client. */
orderSchema.pre('save', function recalculateTotals(next) {
  if (this.isModified('items') || this.isNew) {
    this.items.forEach((item) => {
      item.subtotal = Math.round(item.price * item.qty * 100) / 100;
    });
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  this.total = Math.max(0, this.subtotal + this.taxAmount + this.shippingCost - this.discount);
  next();
});

/** Append to the audit trail whenever the status changes. */
orderSchema.pre('save', function trackStatusChange(next) {
  if (!this.isNew && this.isModified('orderStatus')) {
    this.statusHistory.push({ status: this.orderStatus, at: new Date() });
  }
  next();
});

export const Order: Model<IOrder> = model<IOrder>('Order', orderSchema);
