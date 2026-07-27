/**
 * Server-side data fetching for React Server Components.
 *
 * Uses `fetch` directly (not the browser api-client) so Next.js can apply its
 * data cache: product and category pages are ISR'd with `revalidate: 300`,
 * which keeps a 3G first paint fast without serving day-old stock levels.
 */
import { env } from '@/lib/env';
import type { ApiResponse } from '@/types/api';

/** Product and category pages regenerate every 5 minutes. */
export const CATALOGUE_REVALIDATE = 300;

export interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  /** Never cache — used for anything user-specific. */
  noStore?: boolean;
}

/**
 * Fetch an API envelope on the server.
 * Returns `null` rather than throwing on a failed request: a dead brand strip
 * should degrade the page, not blank it. Callers that genuinely need the data
 * (a product detail page) check for null and call `notFound()`.
 */
export async function serverFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T | null> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(options.noStore
        ? { cache: 'no-store' as const }
        : {
            next: {
              revalidate: options.revalidate ?? CATALOGUE_REVALIDATE,
              ...(options.tags ? { tags: options.tags } : {}),
            },
          }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<T>;
    return body.success ? body.data : null;
  } catch {
    // Network failure or the API being down — render the page without this slice.
    return null;
  }
}

/** Build a query string, dropping empty values. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}
