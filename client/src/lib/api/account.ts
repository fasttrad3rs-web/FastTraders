'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { OrderResponse, QuotationResponse } from './cart.types';
import type { Address, User } from '@/types';

/** Account-scoped queries and mutations. Never cached beyond the session. */

export const accountKeys = {
  me: ['account', 'me'] as const,
  orders: (page: number) => ['account', 'orders', page] as const,
  order: (orderNumber: string) => ['account', 'order', orderNumber] as const,
  quotations: (page: number) => ['account', 'quotations', page] as const,
  quotation: (quoteNumber: string) => ['account', 'quotation', quoteNumber] as const,
  addresses: ['account', 'addresses'] as const,
};

interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export function useMyOrders(page = 1): UseQueryResult<Paged<OrderResponse>> {
  return useQuery({
    queryKey: accountKeys.orders(page),
    queryFn: async () =>
      unwrap(await apiClient.get<Paged<OrderResponse>>('/orders/my', { params: { page, limit: 10 } })),
  });
}

export function useOrder(orderNumber: string): UseQueryResult<OrderResponse> {
  return useQuery({
    queryKey: accountKeys.order(orderNumber),
    queryFn: async () => unwrap(await apiClient.get<OrderResponse>(`/orders/${orderNumber}`)),
    enabled: orderNumber.length > 0,
  });
}

export function useMyQuotations(page = 1): UseQueryResult<Paged<QuotationResponse>> {
  return useQuery({
    queryKey: accountKeys.quotations(page),
    queryFn: async () =>
      unwrap(
        await apiClient.get<Paged<QuotationResponse>>('/quotations/my', { params: { page, limit: 10 } }),
      ),
  });
}

export function useQuotation(quoteNumber: string): UseQueryResult<QuotationResponse> {
  return useQuery({
    queryKey: accountKeys.quotation(quoteNumber),
    queryFn: async () => unwrap(await apiClient.get<QuotationResponse>(`/quotations/${quoteNumber}`)),
    enabled: quoteNumber.length > 0,
  });
}

export function useAddresses(): UseQueryResult<Address[]> {
  return useQuery({
    queryKey: accountKeys.addresses,
    queryFn: async () => unwrap(await apiClient.get<Address[]>('/auth/me/addresses')),
  });
}

export function useAddressMutations(): {
  add: UseMutationResult<Address[], Error, Address>;
  update: UseMutationResult<Address[], Error, { index: number; patch: Partial<Address> }>;
  remove: UseMutationResult<Address[], Error, number>;
} {
  const queryClient = useQueryClient();
  const onSuccess = (data: Address[]): void => {
    queryClient.setQueryData(accountKeys.addresses, data);
  };

  return {
    add: useMutation({
      mutationFn: async (address) => unwrap(await apiClient.post<Address[]>('/auth/me/addresses', address)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: async ({ index, patch }) =>
        unwrap(await apiClient.patch<Address[]>(`/auth/me/addresses/${index}`, patch)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (index) => unwrap(await apiClient.delete<Address[]>(`/auth/me/addresses/${index}`)),
      onSuccess,
    }),
  };
}

export function useUpdateProfile(): UseMutationResult<User, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.patch<User>('/auth/me', input)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: accountKeys.me }),
  });
}

export function useChangePassword(): UseMutationResult<
  { accessToken: string },
  Error,
  { currentPassword: string; newPassword: string }
> {
  return useMutation({
    mutationFn: async (input) =>
      unwrap(await apiClient.patch<{ accessToken: string }>('/auth/me/password', input)),
  });
}
