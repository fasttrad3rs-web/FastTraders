'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { Product, ProductVariant } from '@/types';

/**
 * Admin view of a product.
 *
 * `unit` and `minOrderQty` are already on the public shape — a buyer cannot
 * read "12" without knowing whether that is pieces or metres. What this adds
 * is everything the whitelist drops.
 */
export interface AdminProduct extends Product {
  /*
   * Everything the public `Product` drops. The admin API opts into these
   * explicitly with `.select('+lastQuotedPrice +internalCost +supplierNotes')`,
   * and this is the only client-side type that names them.
   */
  lastQuotedPrice?: number;
  internalCost?: number;
  supplierNotes?: string;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  salesCount: number;
  updatedAt: string;
  variants: AdminProductVariant[];
}

export interface AdminProductVariant extends ProductVariant {
  price?: number;
  stock: number;
}


/** Typed hooks over the Phase 4 admin API. */

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  charts: (granularity: string, days: number) => ['admin', 'charts', granularity, days] as const,
  recent: ['admin', 'recent'] as const,
  products: (params: Record<string, unknown>) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  taxonomy: (kind: string) => ['admin', kind] as const,
};

export interface AdminMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminList<T> {
  items: T[];
  meta: AdminMeta;
  filteredRevenue?: number;
}

/* ------------------------------- Dashboard ------------------------------- */

/**
 * MIRRORS `server/src/services/dashboard.service.ts` — keep the two in step.
 *
 * These declarations had drifted right through the catalogue pivot: the client
 * still described `enquiries`, `quotations` and `quotationWinRate` while the
 * API had moved to `inquiries`, `byStatus` and `winRate`. Because the client
 * declares its *own* copy, `tsc` had nothing to compare against and stayed
 * silent — the drift only surfaced as a runtime crash reading
 * `stats.quotations.new`. `npm run verify` now diffs the two field by field.
 *
 * There is no revenue on this dashboard because the site takes no money. The
 * funnel is: shortlist → inquiry → contacted → quoted on the phone → won or
 * lost. Quoted value is labelled *pipeline* everywhere, never income.
 */
export interface DashboardStats {
  inquiries: { newToday: number; newThisWeek: number; total: number; open: number };
  /** Counts keyed by inquiry status — `new`, `contacted`, `won`, and so on. */
  byStatus: Record<string, number>;
  /** Counts keyed by inquiry type — `product_inquiry`, `sourcing_request`. */
  byType: Record<string, number>;
  /** Value quoted verbally. Indicative only — somebody typed it in after a call. */
  pipeline: { quotedThisMonth: number; wonThisMonth: number; averageQuote: number };
  inventory: { lowStock: number; outOfStock: number; imported: number; totalActive: number };
  winRate: number;
  /** In `new` with nobody assigned — the thing to fix before lunch. */
  unassigned: number;
  /** Shortlists with items that were never submitted. */
  abandonedLists: number;
  pending: { contacts: number; testimonials: number };
  /** Still `new` after a full working day — the number that should be zero. */
  overdue: number;
  /** Chase dates that have arrived or passed on still-open inquiries. */
  followUpsDue: number;
  /** Where the demand comes from. */
  byCity: { name: string; inquiries: number }[];
  /** Most-asked-for items that are not in the catalogue. */
  topRequestedNotStocked: { name: string; inquiries: number }[];
}

/** One bar/row of demand: how many inquiries touched it, and for how many units. */
export interface NamedTotal {
  id: string;
  name: string;
  inquiries: number;
  units: number;
}

export interface DashboardCharts {
  inquiriesOverTime: { period: string; inquiries: number; won: number }[];
  topInquiredProducts: NamedTotal[];
  inquiriesByCategory: NamedTotal[];
  inquiriesByBrand: NamedTotal[];
}

export function useAdminStats({ enabled = true } = {}): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async () => unwrap(await apiClient.get<DashboardStats>('/admin/dashboard/stats')),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminCharts(
  granularity: 'daily' | 'weekly' | 'monthly',
  days: number,
): UseQueryResult<DashboardCharts> {
  return useQuery({
    queryKey: adminKeys.charts(granularity, days),
    queryFn: async () =>
      unwrap(
        await apiClient.get<DashboardCharts>('/admin/dashboard/charts', {
          params: { granularity, days },
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useAdminRecent(): UseQueryResult<Record<string, unknown[]>> {
  return useQuery({
    queryKey: adminKeys.recent,
    queryFn: async () => unwrap(await apiClient.get<Record<string, unknown[]>>('/admin/dashboard/recent')),
    staleTime: 30_000,
  });
}

/* -------------------------------- Products ------------------------------- */

/** Query params are always scalars; the type mirrors the api-client contract. */
export type AdminQuery = Record<string, string | number | boolean | undefined>;

export function useAdminProducts(params: AdminQuery): UseQueryResult<AdminList<AdminProduct>> {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<AdminProduct>>('/admin/products', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string): UseQueryResult<AdminProduct> {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: async () => unwrap(await apiClient.get<AdminProduct>(`/admin/products/${id}`)),
    enabled: id.length > 0,
  });
}

/**
 * Product write operations.
 *
 * The status toggle updates optimistically — flipping a switch should feel
 * instant, and the previous list is restored if the request fails.
 */
export function useProductMutations(): {
  create: UseMutationResult<AdminProduct, Error, Record<string, unknown>>;
  update: UseMutationResult<AdminProduct, Error, { id: string; patch: Record<string, unknown> }>;
  remove: UseMutationResult<AdminProduct, Error, string>;
  /** Permanent. `remove` only hides; this one is gone. */
  purge: UseMutationResult<{ id: string; name: string }, Error, string>;
  bulk: UseMutationResult<{ modified: number }, Error, Record<string, unknown>>;
  adjustStock: UseMutationResult<
    { sku: string; previous: number; current: number },
    Error,
    { id: string; mode: 'set' | 'increment' | 'decrement'; quantity: number; reason: string }
  >;
} {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  return {
    create: useMutation({
      mutationFn: async (input) => unwrap(await apiClient.post<AdminProduct>('/admin/products', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }) =>
        unwrap(await apiClient.patch<AdminProduct>(`/admin/products/${id}`, patch)),
      onSuccess: (product) => {
        queryClient.setQueryData(adminKeys.product(product.id), product);
        invalidate();
      },
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete<AdminProduct>(`/admin/products/${id}`)),
      onSuccess: invalidate,
    }),
    purge: useMutation({
      mutationFn: async (id) =>
        unwrap(await apiClient.delete<{ id: string; name: string }>(`/admin/products/${id}/permanent`)),
      onSuccess: (result) => {
        // Nothing left to cache — drop the detail entry as well as the list.
        queryClient.removeQueries({ queryKey: adminKeys.product(result.id) });
        invalidate();
      },
    }),
    bulk: useMutation({
      mutationFn: async (input) =>
        unwrap(await apiClient.post<{ modified: number }>('/admin/products/bulk', input)),
      onSuccess: invalidate,
    }),
    adjustStock: useMutation({
      mutationFn: async ({ id, ...body }) =>
        unwrap(
          await apiClient.patch<{ sku: string; previous: number; current: number }>(
            `/admin/products/${id}/stock`,
            body,
          ),
        ),
      onSuccess: invalidate,
    }),
  };
}



/** Taxonomy lists reused by the product form's selects. */
/**
 * Staff accounts, for the assignee pickers.
 *
 * Only active ones: assigning an inquiry to somebody who has left is a lead
 * nobody is looking at, which is worse than leaving it unassigned.
 */
export function useStaff(): UseQueryResult<{ id: string; name: string; email: string }[]> {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async () => {
      const page = unwrap(
        await apiClient.get<AdminList<{ id: string; name: string; email: string }>>(
          '/admin/users',
          { params: { isActive: true, limit: 100 } },
        ),
      );
      return page.items;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Flat category/brand list for the product form's selects.
 *
 * `parent` matters: the sub-category select has to offer only the children of
 * the chosen category. Without it the form listed every nested category, so a
 * product could be filed under Control Components with a sub-category of
 * Sensors — which belongs to Automation — and then appear under neither.
 */
export interface TaxonomyOption {
  id: string;
  name: string;
  slug: string;
  level?: number;
  /** Null for a top-level category. Absent on brands. */
  parent?: string | null;
}

export function useTaxonomy(kind: 'categories' | 'brands'): UseQueryResult<TaxonomyOption[]> {
  return useQuery({
    queryKey: adminKeys.taxonomy(kind),
    queryFn: async () => unwrap(await apiClient.get<TaxonomyOption[]>(`/admin/${kind}`)),
    staleTime: 5 * 60_000,
  });
}
