import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Tells the storefront to drop cached pages after an admin write.
 *
 * The Next.js front end serves the catalogue with ISR. Without this, hiding a
 * product in the admin left it on the homepage until the `revalidate` window
 * expired — five minutes of a deactivated item still being offered, with the
 * operator staring at a toggle that looked broken.
 *
 * Three deliberate properties:
 *
 *   - **Fire and forget.** Never awaited by a controller. A product save must
 *     not fail, or hang, because the front end is redeploying.
 *   - **Feature-flagged.** No `REVALIDATE_URL`/`REVALIDATE_SECRET` means the
 *     call is skipped silently. Local API work against no front end is normal.
 *   - **Logged on failure, never thrown.** A missed invalidation costs one
 *     cache window; a 500 on save costs the operator their work.
 */

/** Cache tags the storefront attaches to its fetches. Keep in step with `client/src/lib/api`. */
export type CacheTag =
  | 'products'
  | 'categories'
  | 'brands'
  | 'banners'
  | 'testimonials'
  | 'settings'
  | `product:${string}`
  | `category:${string}`;

export function revalidate(tags: CacheTag[]): void {
  const url = env.REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;

  if (!url || !secret || tags.length === 0) return;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
    body: JSON.stringify({ tags }),
    // The storefront is not allowed to hold up an admin request.
    signal: AbortSignal.timeout(3000),
  })
    .then((response) => {
      if (!response.ok) {
        logger.warn(`[revalidate] ${url} answered ${response.status} for [${tags.join(', ')}]`);
      }
    })
    .catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`[revalidate] could not reach the storefront (${reason})`);
    });
}
