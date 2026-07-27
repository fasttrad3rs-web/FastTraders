'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProductQueryParams } from '@/lib/api/catalog';

/**
 * Filter state lives in the URL, not in React state.
 *
 * That makes every filtered view shareable, bookmarkable and back-button
 * friendly — which matters when a buyer sends a colleague "the 250 A MCCBs we
 * looked at". It also means the server component and the client query read
 * from the same source.
 */

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name';
export type LayoutMode = 'grid' | 'list';

export interface CatalogFilters extends ProductQueryParams {
  page: number;
  sort: SortOption;
}

const SORTS: SortOption[] = ['newest', 'price_asc', 'price_desc', 'popular', 'name'];

/** Parse the current search params into a typed query object. */
export function parseFilters(params: URLSearchParams): CatalogFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const sort = params.get('sort');
  const pricingMode = params.get('pricingMode');

  return {
    page: number('page') ?? 1,
    limit: number('limit') ?? 24,
    sort: SORTS.includes(sort as SortOption) ? (sort as SortOption) : 'newest',
    ...(params.get('category') ? { category: params.get('category') as string } : {}),
    ...(params.get('brand') ? { brand: params.get('brand') as string } : {}),
    ...(number('minPrice') !== undefined ? { minPrice: number('minPrice') } : {}),
    ...(number('maxPrice') !== undefined ? { maxPrice: number('maxPrice') } : {}),
    ...(params.get('inStock') === 'true' ? { inStock: true } : {}),
    ...(pricingMode === 'retail' || pricingMode === 'quote' || pricingMode === 'both'
      ? { pricingMode }
      : {}),
    ...(params.get('tags') ? { tags: params.get('tags') as string } : {}),
    ...(params.get('search') ? { search: params.get('search') as string } : {}),
    ...(params.get('specs') ? { specs: params.get('specs') as string } : {}),
  };
}

export interface CatalogFilterApi {
  filters: CatalogFilters;
  /** Merge a patch into the URL. Any change except `page` resets to page 1. */
  setFilter: (patch: Record<string, string | number | boolean | undefined>) => void;
  /** Add or remove one value from a comma-separated parameter. */
  toggleInList: (key: 'brand' | 'tags', value: string) => void;
  /** Add or remove one `Key:Value` spec filter. */
  toggleSpec: (key: string, value: string) => void;
  clearAll: () => void;
  activeCount: number;
}

const FILTER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'inStock', 'pricingMode', 'tags', 'specs'];

export function useCatalogFilters(): CatalogFilterApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams)), [searchParams]);

  const push = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      // `scroll: false` keeps the shopper's place in the grid when they tick a box.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setFilter = useCallback(
    (patch: Record<string, string | number | boolean | undefined>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === false) next.delete(key);
        else next.set(key, String(value));
      }

      if (!Object.hasOwn(patch, 'page')) next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const toggleInList = useCallback(
    (key: 'brand' | 'tags', value: string) => {
      const next = new URLSearchParams(searchParams);
      const current = (next.get(key) ?? '').split(',').filter(Boolean);
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (updated.length === 0) next.delete(key);
      else next.set(key, updated.join(','));

      next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const toggleSpec = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      const token = `${key}:${value}`;
      const current = (next.get('specs') ?? '').split('|').filter(Boolean);
      const updated = current.includes(token)
        ? current.filter((item) => item !== token)
        : [...current, token];

      if (updated.length === 0) next.delete('specs');
      else next.set('specs', updated.join('|'));

      next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    // The search term and sort survive a filter reset; the filters do not.
    FILTER_KEYS.forEach((key) => next.delete(key));
    next.delete('page');
    push(next);
  }, [push, searchParams]);

  const activeCount = FILTER_KEYS.reduce((count, key) => {
    const value = searchParams.get(key);
    if (!value) return count;
    if (key === 'brand' || key === 'tags') return count + value.split(',').filter(Boolean).length;
    if (key === 'specs') return count + value.split('|').filter(Boolean).length;
    return count + 1;
  }, 0);

  return { filters, setFilter, toggleInList, toggleSpec, clearAll, activeCount };
}
