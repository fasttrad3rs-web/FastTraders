import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Pakistani Rupees — "Rs. 12,500".
 *
 * The symbol is composed manually rather than via `style: 'currency'`:
 * ICU renders PKR as "Rs" (no full stop) under full ICU and as "PKR" under
 * Node's small-icu build, so a currency-formatted string would differ between
 * the server render and the browser and trip a hydration mismatch.
 */
export function formatPKR(amount: number, options?: { withDecimals?: boolean }): string {
  const withDecimals = options?.withDecimals ?? false;
  const digits = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);

  return `Rs. ${digits}`;
}

/** Format an ISO date string for display (e.g. "12 Mar 2026"). */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Convert an arbitrary string into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Truncate text to `max` characters, appending an ellipsis when cut. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Build a wa.me deep link with an optional pre-filled message. */
export function whatsappLink(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Type-safe "this should never happen" guard for exhaustive switches. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
