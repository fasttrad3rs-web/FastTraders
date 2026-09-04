/**
 * Guard for image URLs that arrive from the database.
 *
 * `next/image` **throws** — it does not warn, and it does not render a broken
 * tile — when `src` names a hostname absent from `remotePatterns` in
 * `next.config.mjs`. Thrown inside a Server Component, that takes down the
 * whole route: one bad banner URL replaced the entire home page with the error
 * boundary while the header and footer still rendered.
 *
 * Banner and product image URLs are typed into the admin by shop staff, so
 * this cannot be fixed by being careful with the seed alone. Anything not
 * provably renderable is swapped for local placeholder artwork: a homepage
 * with one placeholder beats a homepage that is gone.
 *
 * Keep `ALLOWED_HOSTS` in step with `remotePatterns`.
 */

const ALLOWED_HOSTS = ['res.cloudinary.com'];

export const IMAGE_FALLBACK = '/placeholders/default.svg';

/** Would `next/image` accept this source? */
export function isRenderableImage(src: string | undefined | null): src is string {
  if (!src) return false;

  // Root-relative paths are served straight from /public. `//host/x` is a
  // protocol-relative URL, not a local path, so require a non-slash after.
  if (src.startsWith('/')) return !src.startsWith('//');

  /*
   * `blob:` is a local preview of a file the user picked a moment ago, made by
   * `URL.createObjectURL` in this same document. It never touches the network
   * and cannot address anything outside this origin, so `remotePatterns` has
   * no opinion on it — but it does have to bypass the optimizer.
   */
  if (src.startsWith('blob:')) return true;

  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return ALLOWED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/** The source if it can be rendered, otherwise branded placeholder artwork. */
export function safeImageSrc(src: string | undefined | null, fallback = IMAGE_FALLBACK): string {
  return isRenderableImage(src) ? src : fallback;
}

/**
 * Should this source bypass the image optimizer?
 *
 * `/_next/image` returns **400** for `image/svg+xml` unless the config sets
 * `dangerouslyAllowSVG` — which is how every placeholder ended up rendering as
 * alt text. Turning that flag on works, but it is the wrong lever: it would
 * also permit an SVG from any allowed remote host, and it buys nothing here.
 * There is no optimisation to perform on a 2 kB vector; the optimizer would
 * hand back the same bytes.
 *
 * Marking vector sources `unoptimized` serves them straight from `/public`,
 * which is both correct and faster, and lets the flag stay off.
 */
export function isVectorAsset(src: string): boolean {
  // Object URLs carry no extension and must never be sent to /_next/image,
  // which cannot fetch them — the optimizer runs on the server.
  if (src.startsWith('blob:') || src.startsWith('data:')) return true;
  // Ignore any query string: `/placeholders/a.svg?v=2` is still an SVG.
  return /\.svg($|\?)/i.test(src);
}

/**
 * Everything `next/image` needs for a source that came from the database.
 *
 *     <Image {...imageProps(product.images[0]?.url)} alt={…} fill sizes={…} />
 *
 * Spreading one helper rather than passing `src` and `unoptimized` separately
 * means the two can never disagree — a guarded `src` with the wrong
 * `unoptimized` renders as alt text, which is exactly the bug this replaces.
 */
export function imageProps(
  src: string | undefined | null,
  fallback = IMAGE_FALLBACK,
): { src: string; unoptimized: boolean } {
  const resolved = safeImageSrc(src, fallback);
  return { src: resolved, unoptimized: isVectorAsset(resolved) };
}
