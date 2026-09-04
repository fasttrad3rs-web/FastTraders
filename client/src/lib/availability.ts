import type { Availability } from '@/types';

/**
 * Buyer-facing wording for the four availability states.
 *
 * One definition, used by the product badge and the catalogue filter, so the
 * shopper cannot see "Ready Stock" on a card and "In stock" in the sidebar and
 * wonder whether they mean different things.
 *
 * No `'use client'` here on purpose: `/products` is a Server Component and
 * imports the filter parser, which imports this.
 */
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  ready_stock: 'Ready Stock',
  available_on_order: 'Available on Order',
  import_on_request: 'Import on Request',
  discontinued: 'Discontinued',
};

/**
 * The four values, derived from the label record so the type checker — not a
 * reviewer — is what guarantees the list stays complete.
 */
export const AVAILABILITY = Object.keys(AVAILABILITY_LABELS) as Availability[];

export function isAvailability(value: string | null | undefined): value is Availability {
  return value !== null && value !== undefined && value in AVAILABILITY_LABELS;
}
