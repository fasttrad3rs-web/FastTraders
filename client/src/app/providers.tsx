'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth-context';
import { useCartStore } from '@/store/cart-store';

/**
 * Client provider tree. Kept out of `layout.tsx` so the root layout stays a
 * Server Component and the page shell can still stream.
 */

/**
 * Zustand's `persist` rehydrates asynchronously. Marking the store hydrated
 * only after mount keeps the SSR badge (0) and the first client render in
 * agreement, avoiding a hydration mismatch.
 */
function CartHydration({ children }: { children: ReactNode }): JSX.Element {
  const setHydrated = useCartStore((state) => state.setHydrated);

  useEffect(() => {
    void useCartStore.persist.rehydrate();
    setHydrated();
  }, [setHydrated]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  // One QueryClient per browser session, created lazily so it is never shared
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Pakistan is mobile-heavy on 3G — cache hard, refetch rarely.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <CartHydration>{children}</CartHydration>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
