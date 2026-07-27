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
import type { AdminList, AdminQuery } from './admin';
import type { QuotationResponse, OrderResponse } from './cart.types';
import type { Setting } from '@/types';

/**
 * Hooks for the remaining Phase 4 admin endpoints.
 *
 * Split from `admin.ts` to keep both files readable; the query-key namespace
 * is shared so a mutation in one can invalidate the other.
 */

export const resourceKeys = {
  list: (resource: string, params: unknown) => ['admin', resource, params] as const,
  item: (resource: string, id: string) => ['admin', resource, 'item', id] as const,
};

/** Generic list hook — every admin collection returns the same envelope. */
export function useAdminList<T>(resource: string, params: AdminQuery = {}): UseQueryResult<AdminList<T>> {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<T>>(`/admin/${resource}`, { params })),
    placeholderData: keepPreviousData,
  });
}

/** Taxonomy endpoints return a bare array rather than a paginated envelope. */
export function useAdminCollection<T>(resource: string, params: AdminQuery = {}): UseQueryResult<T[]> {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: async () => unwrap(await apiClient.get<T[]>(`/admin/${resource}`, { params })),
    placeholderData: keepPreviousData,
  });
}

export interface CrudApi<T> {
  create: UseMutationResult<T, Error, Record<string, unknown>>;
  update: UseMutationResult<T, Error, { id: string; patch: Record<string, unknown> }>;
  remove: UseMutationResult<null, Error, string>;
  reorder: UseMutationResult<null, Error, { id: string; displayOrder: number }[]>;
}

export function useCrud<T>(resource: string): CrudApi<T> {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', resource] });
  };

  return {
    create: useMutation({
      mutationFn: async (body) => unwrap(await apiClient.post<T>(`/admin/${resource}`, body)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }) => unwrap(await apiClient.patch<T>(`/admin/${resource}/${id}`, patch)),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id) => {
        await apiClient.delete(`/admin/${resource}/${id}`);
        return null;
      },
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: async (items) => {
        await apiClient.patch(`/admin/${resource}/reorder`, { items });
        return null;
      },
      onSuccess: invalidate,
    }),
  };
}

/* ------------------------------- Quotations ------------------------------ */

export function useAdminQuotation(id: string): UseQueryResult<QuotationResponse> {
  return useQuery({
    queryKey: resourceKeys.item('quotations', id),
    queryFn: async () => unwrap(await apiClient.get<QuotationResponse>(`/admin/quotations/${id}`)),
    enabled: id.length > 0,
  });
}

export interface QuotationApi {
  price: UseMutationResult<QuotationResponse, Error, Record<string, unknown>>;
  send: UseMutationResult<{ sentTo: string }, Error, void>;
  convert: UseMutationResult<{ order: OrderResponse }, Error, Record<string, unknown>>;
  assign: UseMutationResult<QuotationResponse, Error, string | null>;
}

export function useQuotationActions(id: string): QuotationApi {
  const queryClient = useQueryClient();
  const seed = (data: QuotationResponse): void => {
    queryClient.setQueryData(resourceKeys.item('quotations', id), data);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] });
  };

  return {
    price: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<QuotationResponse>(`/admin/quotations/${id}`, body)),
      onSuccess: seed,
    }),
    send: useMutation({
      mutationFn: async () =>
        unwrap(await apiClient.post<{ sentTo: string }>(`/admin/quotations/${id}/send`)),
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] }),
    }),
    convert: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.post<{ order: OrderResponse }>(`/admin/quotations/${id}/convert`, body)),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      },
    }),
    assign: useMutation({
      mutationFn: async (assignedTo) =>
        unwrap(await apiClient.patch<QuotationResponse>(`/admin/quotations/${id}/assign`, { assignedTo })),
      onSuccess: seed,
    }),
  };
}

/* -------------------------------- Settings ------------------------------- */

export function useAdminSettings(): UseQueryResult<Setting> {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => unwrap(await apiClient.get<Setting>('/admin/settings')),
  });
}

export function useUpdateSettings(): UseMutationResult<Setting, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => unwrap(await apiClient.patch<Setting>('/admin/settings', body)),
    onSuccess: (data) => queryClient.setQueryData(['admin', 'settings'], data),
  });
}

/* -------------------------------- Reviews -------------------------------- */

export function useReviewModeration(): {
  approve: UseMutationResult<unknown, Error, { id: string; isApproved: boolean }>;
  remove: UseMutationResult<unknown, Error, string>;
} {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  };

  return {
    approve: useMutation({
      mutationFn: async ({ id, isApproved }) =>
        unwrap(await apiClient.patch(`/admin/reviews/${id}/approval`, { isApproved })),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete(`/admin/reviews/${id}`)),
      onSuccess: invalidate,
    }),
  };
}

/* -------------------------------- Contacts ------------------------------- */

export function useContactStatus(): UseMutationResult<unknown, Error, { id: string; status: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => unwrap(await apiClient.patch(`/admin/contacts/${id}`, { status })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'contacts'] }),
  });
}
