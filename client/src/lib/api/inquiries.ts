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
import type { FollowUp, Inquiry, InquiryPriority, InquiryStatus } from '@/types';

/**
 * Admin inquiry hooks.
 *
 * The detail endpoint populates each line's product **with** its internal
 * cost, last quoted price and supplier notes — this is the screen a price
 * gets worked out on, and sending staff to a second tab is how wrong numbers
 * get said out loud on the phone.
 */

export const inquiryKeys = {
  list: (params: AdminQuery) => ['admin', 'inquiries', params] as const,
  detail: (id: string) => ['admin', 'inquiry', id] as const,
};

/** A line with the staff-only figures the detail endpoint attaches. */
export interface AdminInquiryLine {
  product:
    | string
    | {
        id: string;
        name: string;
        sku: string;
        slug: string;
        availability: string;
        leadTime?: string;
        stock?: number;
        internalCost?: number;
        lastQuotedPrice?: number;
        supplierNotes?: string;
      };
  name: string;
  sku: string;
  brand?: string;
  qty: number;
  unit: string;
  note?: string;
}

/**
 * A follow-up as the *detail* endpoint returns it.
 *
 * The mirrored `FollowUp` type says `by: string`, which is what the model
 * stores. The detail endpoint populates it — `.populate('followUps.by')` —
 * so the thread can show who wrote each note without a second lookup. The
 * union covers both, because the list endpoint does not populate.
 */
export interface AdminFollowUp extends Omit<FollowUp, 'by'> {
  by: { id: string; name: string } | string;
}

export interface AdminInquiry extends Omit<Inquiry, 'items' | 'assignedTo' | 'followUps'> {
  items: AdminInquiryLine[];
  assignedTo: { id: string; name: string; email: string } | string | null;
  followUps: AdminFollowUp[];
}

export function useInquiries(params: AdminQuery): UseQueryResult<AdminList<AdminInquiry>> {
  return useQuery({
    queryKey: inquiryKeys.list(params),
    queryFn: async () =>
      unwrap(await apiClient.get<AdminList<AdminInquiry>>('/admin/inquiries', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useInquiry(id: string): UseQueryResult<AdminInquiry> {
  return useQuery({
    queryKey: inquiryKeys.detail(id),
    queryFn: async () => unwrap(await apiClient.get<AdminInquiry>(`/admin/inquiries/${id}`)),
    enabled: id.length > 0,
  });
}

export interface InquiryPatch {
  status?: InquiryStatus;
  priority?: InquiryPriority;
  assignedTo?: string | null;
  internalQuotedAmount?: number | null;
  lostReason?: string;
}

export interface BulkInquiryInput {
  ids: string[];
  status?: InquiryStatus;
  assignedTo?: string | null;
  priority?: InquiryPriority;
}

export interface InquiryMutations {
  update: UseMutationResult<AdminInquiry, Error, { id: string; patch: InquiryPatch }>;
  addFollowUp: UseMutationResult<
    AdminInquiry,
    Error,
    { id: string; note: string; nextFollowUpAt?: string }
  >;
  bulk: UseMutationResult<{ matched: number; modified: number }, Error, BulkInquiryInput>;
  remove: UseMutationResult<null, Error, string>;
}

export function useInquiryMutations(): InquiryMutations {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'inquiries'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'inquiry'] });
    // The dashboard funnel counts move with every status change.
    void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  return {
    update: useMutation({
      mutationFn: async ({ id, patch }) =>
        unwrap(await apiClient.patch<AdminInquiry>(`/admin/inquiries/${id}`, patch)),
      onSuccess: invalidate,
    }),
    addFollowUp: useMutation({
      mutationFn: async ({ id, ...body }) =>
        unwrap(await apiClient.post<AdminInquiry>(`/admin/inquiries/${id}/follow-ups`, body)),
      onSuccess: invalidate,
    }),
    bulk: useMutation({
      mutationFn: async (body) =>
        unwrap(
          await apiClient.patch<{ matched: number; modified: number }>(
            '/admin/inquiries/bulk',
            body,
          ),
        ),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete<null>(`/admin/inquiries/${id}`)),
      onSuccess: invalidate,
    }),
  };
}
