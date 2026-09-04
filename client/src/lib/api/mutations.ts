'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';

/**
 * Write operations. There is essentially one: submitting an inquiry.
 *
 * The shortlist itself no longer round-trips. It lives in `inquiryStore`,
 * persisted to localStorage, because a visitor has no account and the guest
 * cookie the server keys on is the first thing a phone browser drops — losing
 * a list somebody spent ten minutes building loses the inquiry with it.
 *
 * The submission sends the store's items explicitly. The server takes the
 * body's list when it is present and falls back to its own session copy
 * otherwise, so a cleared cookie no longer means an empty inquiry. Only ids,
 * quantities and notes are sent — the server re-reads names and SKUs, so the
 * payload cannot mislabel a line.
 */

export interface InquiryCustomerInput {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  company?: string;
  city?: string;
  designation?: string;
}

/** Only what the server is willing to trust from the client. */
export interface SubmitInquiryItem {
  product: string;
  qty: number;
  note?: string;
}

export interface SubmitInquiryInput {
  customer: InquiryCustomerInput;
  items?: SubmitInquiryItem[];
  message?: string;
  preferredContactMethod?: 'phone' | 'whatsapp' | 'email';
  preferredContactTime?: string;
  /** The honeypot. A real browser always submits this empty. */
  website?: string;
}

export interface InquiryReceipt {
  inquiryNumber: string;
  itemCount: number;
}

export function useSubmitInquiry(): UseMutationResult<InquiryReceipt, Error, SubmitInquiryInput> {
  return useMutation({
    mutationFn: async (input) => unwrap(await apiClient.post<InquiryReceipt>('/inquiries', input)),
  });
}

/** Mirrors `sourcingInquirySchema` on the server. */
export interface SourcingInquiryInput extends SubmitInquiryInput {
  sourcingDetails: {
    itemDescription: string;
    preferredBrand?: string;
    partNumber?: string;
    specifications?: string;
    quantity?: number;
    unit?: string;
    /** ISO date; the server coerces it. */
    targetDate?: string;
    urgency?: 'standard' | 'urgent';
    isRepeatRequirement?: boolean;
    application?: string;
  };
  /** reCAPTCHA v3, only present when the site key is configured. */
  recaptchaToken?: string;
}

export interface SourcingReceipt {
  inquiryNumber: string;
  /** How many attachments survived the server's signature check. */
  attachmentsAccepted: number;
  /** Files the server refused, with the reason, so we can say so plainly. */
  attachmentsRejected: { name: string; reason: string }[];
}

/**
 * A sourcing request, with or without files.
 *
 * With attachments it goes as multipart: one `payload` part holding exactly
 * the JSON the request would otherwise have been, plus the files. Flattening
 * the nested shape into `sourcingDetails[quantity]` field names would mean a
 * second schema on the server that drifts from the first, and hand-coercing
 * every number and boolean back from a string on arrival.
 *
 * With no attachments it stays plain JSON — no reason to make the common case
 * pay for the rare one.
 */
export function useSubmitSourcingInquiry(): UseMutationResult<
  SourcingReceipt,
  Error,
  SourcingInquiryInput & { attachments?: File[] }
> {
  return useMutation({
    mutationFn: async ({ attachments, ...input }) => {
      if (!attachments || attachments.length === 0) {
        return unwrap(await apiClient.post<SourcingReceipt>('/inquiries/sourcing', input));
      }

      const form = new FormData();
      form.append('payload', JSON.stringify(input));
      attachments.forEach((file) => form.append('attachments', file));

      return unwrap(await apiClient.post<SourcingReceipt>('/inquiries/sourcing', form));
    },
  });
}
