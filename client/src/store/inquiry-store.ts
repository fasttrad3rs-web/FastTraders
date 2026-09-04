'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
import type { Availability } from '@/types';

/**
 * The inquiry list. The only store in the app.
 *
 * Persisted to localStorage rather than mirrored from the server: a visitor
 * shortlisting breakers has no account, the server copy is keyed on a cookie
 * that a phone browser may drop, and losing a list someone spent ten minutes
 * building is the fastest way to lose the inquiry. The server list still
 * exists and is what the submission reads, but this is what the UI trusts.
 *
 * No price field, because none is published. `availability` is carried so a
 * badge can render from the list without refetching the product.
 */

export interface InquiryItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  brand?: string;
  image?: string;
  availability: Availability;
  qty: number;
  unit: string;
  /** "3P, 36 kA, needed by the 20th" — carried onto the inquiry. */
  note?: string;
}

interface InquiryState {
  items: InquiryItem[];
  /**
   * False until localStorage has rehydrated. Server-rendered markup shows an
   * empty badge; without this flag the first client render would swap in the
   * real count and trip a hydration mismatch.
   */
  hydrated: boolean;

  add: (item: InquiryItem) => void;
  remove: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateNote: (productId: string, note: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

/** Adding something already on the list adds to its quantity. */
function upsert(items: InquiryItem[], incoming: InquiryItem): InquiryItem[] {
  const existing = items.find((item) => item.productId === incoming.productId);
  if (!existing) return [...items, incoming];

  return items.map((item) =>
    item.productId === incoming.productId
      ? { ...item, qty: item.qty + incoming.qty, note: incoming.note ?? item.note }
      : item,
  );
}

export const useInquiryStore = create<InquiryState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      add: (item) => set((state) => ({ items: upsert(state.items, item) })),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),

      updateQty: (productId, qty) =>
        set((state) => ({
          items: state.items.map((item) =>
            // Quantity is an indication of interest, not an order line — the
            // only rule is that it stays a positive whole number.
            item.productId === productId
              ? { ...item, qty: Math.max(1, Math.round(qty)) }
              : item,
          ),
        })),

      updateNote: (productId, note) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, note } : item,
          ),
        })),

      clear: () => set({ items: [] }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.inquiry,
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is derived, never stored.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/* -------------------------------- Selectors ------------------------------- */

/** Total units across every line. Zero until rehydrated, to match SSR. */
export function useInquiryCount(): number {
  return useInquiryStore((state) =>
    state.hydrated ? state.items.reduce((sum, item) => sum + item.qty, 0) : 0,
  );
}

/** Number of distinct products. */
export function useInquiryLineCount(): number {
  return useInquiryStore((state) => (state.hydrated ? state.items.length : 0));
}

/** Whether a given product is already shortlisted. */
export function useIsInInquiry(productId: string): boolean {
  return useInquiryStore((state) =>
    state.hydrated ? state.items.some((item) => item.productId === productId) : false,
  );
}
