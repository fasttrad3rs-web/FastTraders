'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FILTER_KEYS, parseFilters, type CatalogFilters } from './filters';

/**
 * Filter state lives in the URL, not in React state.
 *
 * That makes every filtered view shareable, bookmarkable and back-button
 * friendly — which matters when a buyer sends a colleague "the 250 A MCCBs we
 * looked at". It also means the server component and the client query read
 * from the same source.
 *
 * The parser itself lives in `./filters` with no `'use client'` directive, so
 * the `/products` Server Component can call it too. See the note there.
 */

export type { CatalogFilters, LayoutMode, SortOption } from './filters';
export { SORT_LABELS, SORTS, parseFilters } from './filters';

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
