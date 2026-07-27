'use client';

import { useEffect, useState } from 'react';

/**
 * Reactive media query.
 * Returns `false` on the server so the mobile-first markup is what gets
 * rendered during SSR; the desktop branch swaps in after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)');
