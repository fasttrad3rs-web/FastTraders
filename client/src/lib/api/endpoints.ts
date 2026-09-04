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
    noteUnreachable(url);
    return null;
  }
}

/*
 * One loud warning instead of thirty silent nulls.
 *
 * When the API is unreachable during `next build`, Next logs a raw
 * `[TypeError: fetch failed]` with a stack trace for every single call — around
 * thirty of them — and the build then *succeeds*, because `serverFetch` catches
 * and returns null by design. The result is a set of statically prerendered
 * pages containing no products, no categories and no banners, and nothing in
 * the output that says so.
 *
 * With ISR (`revalidate: 300`) those empty pages are what real visitors get
 * until the first regeneration completes. That is a bad first impression on a
 * catalogue site and it is entirely invisible in the build log.
 *
 * So: say it once, in words, with the fix.
 */
let warned = false;
let failureCount = 0;

function noteUnreachable(url: string): void {
  failureCount += 1;
  if (warned) return;
  warned = true;

  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  // eslint-disable-next-line no-console -- build-time diagnostic, deliberately loud
  console.warn(
    [
      '',
      '  ⚠  The API at ' + origin + ' is unreachable.',
      '',
      '     Pages are still being generated, but WITHOUT catalogue data —',
      '     no products, categories, brands or banners. With ISR these empty',
      '     pages are served to real visitors until the first revalidation.',
      '',
      '     If this is a production build: start the API first, and point',
      '     NEXT_PUBLIC_API_URL at it before building.',
      '',
    ].join('\n'),
  );
}

/** How many server fetches failed. Exposed for build tooling, not for pages. */
export function unreachableFetchCount(): number {
  return failureCount;
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
