import type { ProductQueryParams } from '@/lib/api/catalog';
import { isAvailability } from '@/lib/availability';

/**
 * Catalogue filter state, parsed from the URL.
 *
 * This module deliberately has NO `'use client'` directive. `/products` is a
 * Server Component and calls `parseFilters` during the server render so that
 * the HTML crawlers see matches the first client query. Importing a named
 * export from a `'use client'` module gives a Server Component a *client
 * reference proxy* rather than the function itself — calling it throws
 * "parseFilters is not a function". Keeping the pure parser here and the React
 * hook next door in `use-catalog-filters.ts` is what makes both sides work.
 */

/** Mirrors PRODUCT_SORTS in server/src/validators/catalog.validators.ts. */
export const SORTS = ['newest', 'name_asc', 'name_desc', 'popular'] as const;
export type SortOption = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  popular: 'Most viewed',
  name_asc: 'Name A–Z',
  name_desc: 'Name Z–A',
};

export type LayoutMode = 'grid' | 'list';

export interface CatalogFilters extends ProductQueryParams {
  page: number;
  sort: SortOption;
}

/**
 * Which parameters count towards the "N filters active" badge.
 * No price keys: nothing in this catalogue is publicly priced.
 */
export const FILTER_KEYS = [
  'category',
  'brand',
  'availability',
  'isImportItem',
  'tags',
  'specs',
] as const;

function isSortOption(value: string | null): value is SortOption {
  return value !== null && (SORTS as readonly string[]).includes(value);
}

/** Parse a set of search params into a typed, defaulted query object. */
export function parseFilters(params: URLSearchParams): CatalogFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const sort = params.get('sort');
  const availability = params.get('availability');

  return {
    page: number('page') ?? 1,
    limit: number('limit') ?? 24,
    // An unrecognised sort would 422 at the API, so fall back rather than
    // forward whatever happened to be in the query string.
    sort: isSortOption(sort) ? sort : 'newest',
    ...(params.get('category') ? { category: params.get('category') as string } : {}),
    ...(params.get('brand') ? { brand: params.get('brand') as string } : {}),
    ...(isAvailability(availability) ? { availability } : {}),
    ...(params.get('isImportItem') === 'true' ? { isImportItem: true } : {}),
    ...(params.get('tags') ? { tags: params.get('tags') as string } : {}),
    ...(params.get('search') ? { search: params.get('search') as string } : {}),
    ...(params.get('specs') ? { specs: params.get('specs') as string } : {}),
  };
}
