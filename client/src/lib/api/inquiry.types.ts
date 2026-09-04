/**
 * Hydrated enquiry shortlist returned by `/inquiry-list`.
 * No price field exists on this shape — nothing is published.
 */
export interface EnquiryLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  partNumber?: string;
  brand?: string;
  image?: string;
  unit: string;
  qty: number;
  note?: string;
  isMadeToOrder: boolean;
  isAvailable: boolean;
}

export interface EnquirySummary {
  items: EnquiryLine[];
  itemCount: number;
  lineCount: number;
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
