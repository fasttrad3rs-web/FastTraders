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
import type { Product } from '@/types';
import type { OrderResponse } from './cart.types';

/** Typed hooks over the Phase 4 admin API. */

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  charts: (granularity: string, days: number) => ['admin', 'charts', granularity, days] as const,
  recent: ['admin', 'recent'] as const,
  products: (params: Record<string, unknown>) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  orders: (params: Record<string, unknown>) => ['admin', 'orders', params] as const,
  order: (id: string) => ['admin', 'order', id] as const,
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

export interface PeriodRevenue {
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  revenue: { today: PeriodRevenue; week: PeriodRevenue; month: PeriodRevenue; year: PeriodRevenue };
  ordersByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  quotations: { new: number; awaitingResponse: number; total: number };
  inventory: { lowStock: number; outOfStock: number; totalActive: number };
  customers: { newThisMonth: number; total: number };
  averageOrderValue: number;
  quotationConversionRate: number;
  checkoutConversionRate: number;
  pending: { reviews: number; contacts: number };
}

export interface NamedTotal {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface DashboardCharts {
  salesOverTime: { period: string; revenue: number; orders: number }[];
  topProducts: NamedTotal[];
  revenueByCategory: NamedTotal[];
  revenueByBrand: NamedTotal[];
}

export function useAdminStats(): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async () => unwrap(await apiClient.get<DashboardStats>('/admin/dashboard/stats')),
    staleTime: 60_000,
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

export function useAdminProducts(params: AdminQuery): UseQueryResult<AdminList<Product>> {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<Product>>('/admin/products', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string): UseQueryResult<Product> {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: async () => unwrap(await apiClient.get<Product>(`/admin/products/${id}`)),
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
  create: UseMutationResult<Product, Error, Record<string, unknown>>;
  update: UseMutationResult<Product, Error, { id: string; patch: Record<string, unknown> }>;
  remove: UseMutationResult<Product, Error, string>;
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
      mutationFn: async (input) => unwrap(await apiClient.post<Product>('/admin/products', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }) =>
        unwrap(await apiClient.patch<Product>(`/admin/products/${id}`, patch)),
      onSuccess: (product) => {
        queryClient.setQueryData(adminKeys.product(product.id), product);
        invalidate();
      },
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete<Product>(`/admin/products/${id}`)),
      onSuccess: invalidate,
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

/* --------------------------------- Orders -------------------------------- */

export function useAdminOrders(params: AdminQuery): UseQueryResult<AdminList<OrderResponse>> {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<OrderResponse>>('/admin/orders', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string): UseQueryResult<OrderResponse> {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: async () => unwrap(await apiClient.get<OrderResponse>(`/admin/orders/${id}`)),
    enabled: id.length > 0,
  });
}

export function useOrderMutations(id: string): {
  status: UseMutationResult<OrderResponse, Error, { status: string; note?: string; notifyCustomer: boolean }>;
  payment: UseMutationResult<OrderResponse, Error, Record<string, unknown>>;
  tracking: UseMutationResult<OrderResponse, Error, Record<string, unknown>>;
} {
  const queryClient = useQueryClient();
  const onSuccess = (order: OrderResponse): void => {
    queryClient.setQueryData(adminKeys.order(id), order);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  return {
    status: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/status`, body)),
      onSuccess,
    }),
    payment: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/payment`, body)),
      onSuccess,
    }),
    tracking: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/tracking`, body)),
      onSuccess,
    }),
  };
}

/** Taxonomy lists reused by the product form's selects. */
export function useTaxonomy(kind: 'categories' | 'brands'): UseQueryResult<
  { id: string; name: string; slug: string; level?: number }[]
> {
  return useQuery({
    queryKey: adminKeys.taxonomy(kind),
    queryFn: async () =>
      unwrap(await apiClient.get<{ id: string; name: string; slug: string; level?: number }[]>(`/admin/${kind}`)),
    staleTime: 5 * 60_000,
  });
}
