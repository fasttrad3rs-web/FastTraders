/**
 * Commerce types: Order, Quotation, Cart, Coupon.
 * MIRRORED FILE — keep in sync with `server/src/types/commerce.types.ts`.
 */

import type { Address } from './user.types';
import type { ProductUnit } from './catalog.types';

/* ------------------------------- Shared -------------------------------- */

/** Contact block captured at checkout / RFQ time (guests included). */
export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  city?: string;
}

/* -------------------------------- Order -------------------------------- */

export type PaymentMethod = 'cod' | 'bank_transfer' | 'stripe' | 'jazzcash' | 'easypaisa';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

/** Line item — product data is denormalised so history survives catalogue edits. */
export interface OrderItem {
  product: string;
  name: string;
  sku: string;
  image?: string;
  price: number;
  qty: number;
  unit: ProductUnit;
  variant?: string;
  subtotal: number;
}

export interface PaymentDetails {
  transactionId?: string;
  provider?: string;
  paidAt?: string;
  receiptUrl?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  changedBy?: string;
  at: string;
}

export interface Order {
  id: string;
  /** Auto-generated, e.g. FT-202607-0001. */
  orderNumber: string;
  user: string | null;
  items: OrderItem[];
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
  paymentDetails: PaymentDetails;

  orderStatus: OrderStatus;
  statusHistory: StatusHistoryEntry[];

  trackingNumber?: string;
  courier?: string;
  notes?: string;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Quotation ------------------------------- */

export type QuotationStatus =
  | 'new'
  | 'reviewing'
  | 'quoted'
  | 'negotiating'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface QuotationItem {
  product: string;
  name: string;
  sku: string;
  qty: number;
  unit: ProductUnit;
  /** What the buyer asked for on this line. */
  customerNote?: string;
  /** Filled in by an admin when the quote is priced. */
  quotedUnitPrice?: number;
  quotedTotal?: number;
}

export interface Attachment {
  title: string;
  url: string;
  publicId: string;
}

export interface Quotation {
  id: string;
  /** Auto-generated, e.g. FTQ-202607-0001. */
  quoteNumber: string;
  user: string | null;
  customer: CustomerDetails;
  items: QuotationItem[];
  message?: string;
  requiredBy?: string;

  status: QuotationStatus;
  quotedSubtotal?: number;
  quotedTax?: number;
  quotedTotal?: number;
  validUntil?: string;
  adminNotes?: string;
  attachments: Attachment[];

  convertedOrder: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Cart --------------------------------- */

/** Discriminates the two parallel carts stored in one collection. */
export type CartType = 'shopping' | 'inquiry';

export interface CartItem {
  product: string;
  qty: number;
  variant?: string;
  /** Snapshot of the unit price at add-to-cart time (shopping cart only). */
  priceAtAdd?: number;
  /** Buyer note carried into the RFQ (inquiry cart only). */
  note?: string;
  addedAt: string;
}

export interface Cart {
  id: string;
  type: CartType;
  user: string | null;
  sessionId: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------- Coupon -------------------------------- */

export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  /** Caps the discount on percentage coupons. */
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
