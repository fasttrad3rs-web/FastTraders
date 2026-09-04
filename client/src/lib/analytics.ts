'use client';

/**
 * GA4 event helpers.
 *
 * On a catalogue site with no checkout there is no purchase to measure, so
 * *contact* is the conversion. These four events are the whole funnel: what
 * got shortlisted, and which channel someone actually used to reach us.
 *
 * Every call is a no-op when gtag is absent — GA4 has not been installed yet,
 * and a missing tag must never break a phone call.
 */

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: GtagParams) => void;
  }
}

export type ContactChannel = 'mobile' | 'landline' | 'whatsapp';

function track(event: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  // Undefined values are stripped: GA4 renders them as the string
  // "undefined" in reports, which then looks like a real dimension value.
  const clean: GtagParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') clean[key] = value;
  }

  window.gtag('event', event, clean);
}

/** Someone tapped a phone number. */
export function trackCall(params: {
  channel: Exclude<ContactChannel, 'whatsapp'>;
  number: string;
  context?: string;
  sku?: string;
}): void {
  track('contact_call', {
    channel: params.channel,
    phone_number: params.number,
    context: params.context,
    item_sku: params.sku,
  });
}

/** Someone opened WhatsApp. */
export function trackWhatsApp(params: {
  context: 'product' | 'list' | 'generic';
  sku?: string;
  itemCount?: number;
}): void {
  track('contact_whatsapp', {
    context: params.context,
    item_sku: params.sku,
    item_count: params.itemCount,
  });
}

/** Something was shortlisted. The nearest thing here to an add-to-cart. */
export function trackAddToInquiry(params: {
  sku: string;
  name: string;
  brand?: string;
  qty: number;
}): void {
  track('add_to_inquiry', {
    item_sku: params.sku,
    item_name: params.name,
    item_brand: params.brand,
    quantity: params.qty,
  });
}

/** An inquiry was actually sent. The conversion. */
export function trackInquirySubmitted(params: {
  type: 'product_inquiry' | 'sourcing_request' | 'general';
  itemCount: number;
}): void {
  track('inquiry_submitted', { inquiry_type: params.type, item_count: params.itemCount });
}
