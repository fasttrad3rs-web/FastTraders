'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { ProductListResponse, Suggestion } from './types';
import type { ProductQueryParams } from './catalog';

/**
 * Client-side queries.
 *
 * Only the interactive surfaces need these — the filter sidebar re-queries on
 * every change, and search autocomplete runs per keystroke. Everything else is
 * fetched on the server.
 */

/** Query-key factory: one place to look when invalidating. */
export const catalogKeys = {
  all: ['catalog'] as const,
  products: (params: ProductQueryParams) => [...catalogKeys.all, 'products', params] as const,
  suggest: (term: string) => [...catalogKeys.all, 'suggest', term] as const,
};

export function useProducts(params: ProductQueryParams): UseQueryResult<ProductListResponse> {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: async () => {
      const response = await apiClient.get<ProductListResponse>('/products', {
        params: { ...params },
      });
      return unwrap(response);
    },
    // Keeps the previous grid on screen while the next page loads, so the
    // layout does not collapse on a slow connection.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useSuggestions(term: string): UseQueryResult<Suggestion[]> {
  return useQuery({
    queryKey: catalogKeys.suggest(term),
    queryFn: async () => {
      const response = await apiClient.get<Suggestion[]>('/search/suggest', {
        params: { q: term, limit: 8 },
      });
      return unwrap(response);
    },
    enabled: term.trim().length >= 2,
    staleTime: 5 * 60_000,
  });
}
