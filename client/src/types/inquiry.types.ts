/**
 * Inquiry types — the core of the system.
 *
 * MIRRORED FILE — keep in sync between client and server.
 *
 * An inquiry is not a quotation. Fast Traders quotes over the phone or on
 * WhatsApp; what the system records is the request, who made it, and what
 * happened next. There are no priced lines and no formal quote document,
 * which is why nothing here carries money except one admin-only figure.
 */

import type { ProductUnit } from './catalog.types';

export type InquiryType = 'product_inquiry' | 'sourcing_request' | 'general';

export type InquiryStatus =
  | 'new'
  | 'contacted'
  | 'quoted_verbally'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'no_response';

export type InquiryPriority = 'low' | 'normal' | 'high';

export type InquirySource = 'website' | 'whatsapp' | 'phone' | 'walk_in';

export type ContactMethod = 'phone' | 'whatsapp' | 'email';

/*
 * Two values, not three. "Standard" and "urgent" is the only distinction the
 * shop can act on — a middle option ("within a week") just collects everyone
 * who did not want to claim urgency, and tells the counter nothing.
 */
export type Urgency = 'standard' | 'urgent';

/**
 * Who asked. Phone is the only required channel — plenty of trade buyers in
 * Lahore have no email address they check, and demanding one loses the lead.
 */
export interface InquiryCustomer {
  name: string;
  /** Normalised to +92XXXXXXXXXX on the way in. */
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  city?: string;
  designation?: string;
}

export interface InquiryItem {
  product: string;
  name: string;
  sku: string;
  brand?: string;
  qty: number;
  unit: ProductUnit;
  note?: string;
}

export interface ReferenceFile {
  url: string;
  publicId: string;
  name: string;
  type: string;
}

/** Present only on a `sourcing_request` — something we do not stock yet. */
export interface SourcingDetails {
  itemDescription: string;
  preferredBrand?: string;
  partNumber?: string;
  specifications?: string;
  quantity?: number;
  unit?: ProductUnit;
  targetDate?: string;
  urgency?: Urgency;
  isRepeatRequirement?: boolean;
  referenceFiles: ReferenceFile[];
  application?: string;
}

export interface FollowUp {
  note: string;
  by: string;
  at: string;
  nextFollowUpAt?: string;
}

export interface Inquiry {
  id: string;
  /** FT-INQ-YYYYMM-0001 */
  inquiryNumber: string;
  type: InquiryType;
  customer: InquiryCustomer;
  items: InquiryItem[];
  sourcingDetails?: SourcingDetails;
  message?: string;
  preferredContactMethod: ContactMethod;
  preferredContactTime?: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  assignedTo: string | null;
  followUps: FollowUp[];
  /** Admin-only. What we quoted on the phone, so the pipeline has a number. */
  internalQuotedAmount?: number;
  lostReason?: string;
  source: InquirySource;
  createdAt: string;
  updatedAt: string;
}
