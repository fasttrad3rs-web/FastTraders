import type { Availability, Product } from '@/types';

/** The minimum a contact component needs. Structural, so a full `Product`,
 *  a shortlist line or a mock all satisfy it. */
export interface InquirableProduct {
  id: string;
  slug: string;
  name: string;
  sku: string;
  availability: Availability;
  brand?: Product['brand'];
  images?: Product['images'];
  leadTime?: string;
  unit?: string;
}
