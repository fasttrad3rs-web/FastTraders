'use client';

import { useEffect, useState } from 'react';

/**
 * Delay a rapidly changing value.
 * Search autocomplete uses 300 ms — long enough to avoid a request per
 * keystroke on a 3G connection, short enough to still feel live.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
