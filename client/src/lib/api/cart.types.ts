/** Hydrated cart shapes returned by `/cart` and `/inquiry`. */

export interface HydratedCartLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  unit: string;
  qty: number;
  minOrderQty: number;
  variant?: string;
  note?: string;
  price?: number;
  priceAtAdd?: number;
  priceChanged: boolean;
  subtotal?: number;
  stock: number;
  inStock: boolean;
  isAvailable: boolean;
}

export interface CartSummary {
  type: 'shopping' | 'inquiry';
  items: HydratedCartLine[];
  itemCount: number;
  lineCount: number;
  subtotal: number;
  taxAmount: number;
  estimatedTotal: number;
  hasIssues: boolean;
}

export interface OrderSummaryLine {
  product: string;
  name: string;
  sku: string;
  image?: string;
  price: number;
  qty: number;
  unit: string;
  subtotal: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  items: OrderSummaryLine[];
  customer: { name: string; email: string; phone: string; companyName?: string };
  shippingAddress: Record<string, string | boolean | undefined>;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  statusHistory: { status: string; note?: string; at: string }[];
  trackingNumber?: string;
  courier?: string;
  createdAt: string;
}

export interface QuotationResponse {
  id: string;
  quoteNumber: string;
  customer: { name: string; email: string; phone: string; companyName?: string; city?: string };
  items: {
    product: string;
    name: string;
    sku: string;
    qty: number;
    unit: string;
    customerNote?: string;
    quotedUnitPrice?: number;
    quotedTotal?: number;
  }[];
  message?: string;
  requiredBy?: string;
  status: string;
  quotedSubtotal?: number;
  quotedTax?: number;
  quotedTotal?: number;
  validUntil?: string;
  createdAt: string;
}
