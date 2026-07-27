'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * Client-side mirror of the two server carts.
 *
 * The server remains the source of truth (Phase 3 persists both carts against
 * a user or a guest session cookie); this store exists so badge counts and the
 * drawer render instantly, before any request resolves.
 */

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  unit: string;
  qty: number;
  /** Absent on inquiry lines and on quote-only products. */
  price?: number;
  /** Buyer note carried into the RFQ. */
  note?: string;
}

interface CartState {
  shopping: CartLine[];
  inquiry: CartLine[];
  /** False until the persisted state has rehydrated — prevents SSR badge flicker. */
  hydrated: boolean;
  addToCart: (line: CartLine) => void;
  addToInquiry: (line: CartLine) => void;
  updateQty: (cart: 'shopping' | 'inquiry', productId: string, qty: number) => void;
  remove: (cart: 'shopping' | 'inquiry', productId: string) => void;
  clear: (cart: 'shopping' | 'inquiry') => void;
  setHydrated: () => void;
}

function upsert(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((item) => item.productId === line.productId);
  if (!existing) return [...lines, line];
  return lines.map((item) =>
    item.productId === line.productId ? { ...item, qty: item.qty + line.qty } : item,
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      shopping: [],
      inquiry: [],
      hydrated: false,

      addToCart: (line) => set((state) => ({ shopping: upsert(state.shopping, line) })),
      addToInquiry: (line) => set((state) => ({ inquiry: upsert(state.inquiry, line) })),

      updateQty: (cart, productId, qty) =>
        set((state) => {
          const next = state[cart].map((item) =>
            item.productId === productId ? { ...item, qty: Math.max(1, qty) } : item,
          );
          return cart === 'shopping' ? { shopping: next } : { inquiry: next };
        }),

      remove: (cart, productId) =>
        set((state) => {
          const next = state[cart].filter((item) => item.productId !== productId);
          return cart === 'shopping' ? { shopping: next } : { inquiry: next };
        }),

      clear: (cart) =>
        set(() => (cart === 'shopping' ? { shopping: [] } : { inquiry: [] })),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.cart,
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is runtime-only; persisting it would defeat the purpose.
      partialize: (state) => ({ shopping: state.shopping, inquiry: state.inquiry }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Total units in a cart. Returns 0 until hydration to keep SSR and CSR in step. */
export function useCartCount(cart: 'shopping' | 'inquiry'): number {
  return useCartStore((state) =>
    state.hydrated ? state[cart].reduce((sum, line) => sum + line.qty, 0) : 0,
  );
}

export function useCartSubtotal(): number {
  return useCartStore((state) =>
    state.shopping.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0),
  );
}
