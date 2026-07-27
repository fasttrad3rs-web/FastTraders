'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { CartSummary, OrderResponse, QuotationResponse } from './cart.types';

/**
 * Client mutations and user-scoped queries.
 *
 * The server owns both carts (Phase 3 persists them against a user or a guest
 * `ft_session_id` cookie), so these hooks are the source of truth and the
 * Zustand store is only a fast-render mirror.
 */

export const cartKeys = {
  shopping: ['cart', 'shopping'] as const,
  inquiry: ['cart', 'inquiry'] as const,
  orders: ['account', 'orders'] as const,
  quotations: ['account', 'quotations'] as const,
  me: ['auth', 'me'] as const,
};

type CartKind = 'shopping' | 'inquiry';
const basePath = (kind: CartKind): string => (kind === 'shopping' ? '/cart' : '/inquiry');
const keyFor = (kind: CartKind): readonly string[] => (kind === 'shopping' ? cartKeys.shopping : cartKeys.inquiry);

export function useCart(kind: CartKind): UseQueryResult<CartSummary> {
  return useQuery({
    queryKey: keyFor(kind),
    queryFn: async () => unwrap(await apiClient.get<CartSummary>(`${basePath(kind)}/items`)),
    staleTime: 0,
  });
}

export interface CartMutationApi {
  add: UseMutationResult<CartSummary, Error, { product: string; qty: number; note?: string }>;
  update: UseMutationResult<CartSummary, Error, { productId: string; qty?: number; note?: string }>;
  remove: UseMutationResult<CartSummary, Error, string>;
  clear: UseMutationResult<CartSummary, Error, void>;
}

export function useCartMutations(kind: CartKind): CartMutationApi {
  const queryClient = useQueryClient();
  const key = keyFor(kind);
  const path = basePath(kind);

  // Every mutation returns the freshly hydrated cart, so we seed the cache
  // directly instead of triggering a second round trip.
  const onSuccess = (data: CartSummary): void => {
    queryClient.setQueryData(key, data);
  };

  return {
    add: useMutation({
      mutationFn: async (input) => unwrap(await apiClient.post<CartSummary>(`${path}/items`, input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: async ({ productId, ...patch }) =>
        unwrap(await apiClient.patch<CartSummary>(`${path}/items/${productId}`, patch)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (productId) =>
        unwrap(await apiClient.delete<CartSummary>(`${path}/items/${productId}`)),
      onSuccess,
    }),
    clear: useMutation({
      mutationFn: async () => unwrap(await apiClient.delete<CartSummary>(`${path}/items`)),
      onSuccess,
    }),
  };
}

/* -------------------------------- Orders --------------------------------- */

export function useCreateOrder(): UseMutationResult<OrderResponse, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.post<OrderResponse>('/orders', input)),
    onSuccess: () => {
      // The server empties the cart on success; drop our copy too.
      queryClient.removeQueries({ queryKey: cartKeys.shopping });
      void queryClient.invalidateQueries({ queryKey: cartKeys.orders });
    },
  });
}

export function useCreateQuotation(): UseMutationResult<
  QuotationResponse,
  Error,
  Record<string, unknown>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.post<QuotationResponse>('/quotations', input)),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: cartKeys.inquiry });
      void queryClient.invalidateQueries({ queryKey: cartKeys.quotations });
    },
  });
}

export function useRespondToQuotation(): UseMutationResult<
  QuotationResponse,
  Error,
  { id: string; action: 'accept' | 'reject' | 'counter'; message?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }) =>
      unwrap(await apiClient.post<QuotationResponse>(`/quotations/${id}/respond`, body)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cartKeys.quotations }),
  });
}

/** Guest order lookup — number plus the email used at checkout. */
export function useTrackOrder(): UseMutationResult<
  OrderResponse,
  Error,
  { orderNumber: string; email: string }
> {
  return useMutation({
    mutationFn: async ({ orderNumber, email }) =>
      unwrap(await apiClient.get<OrderResponse>(`/orders/${orderNumber}`, { params: { email } })),
  });
}
