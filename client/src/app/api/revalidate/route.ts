import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * On-demand cache invalidation, called by the API after an admin write.
 *
 * The storefront is ISR: the homepage holds `revalidate = 300`, so
 * deactivating a product left it on the page for up to five minutes. Staff
 * hide something, reload, still see it, and reasonably conclude the toggle is
 * broken. Several fetches carried `tags` already, but nothing anywhere called
 * `revalidateTag`, so those tags did nothing at all.
 *
 * Guarded by a shared secret in a header, compared in constant time. Without
 * it this is an unauthenticated endpoint that lets anyone dump the cache of
 * every page on the site — cheap for them, expensive for a 3G visitor.
 *
 * Fails **open** for the caller: the API treats a non-200 as a warning, never
 * an error. A missed invalidation costs at most one `revalidate` window; a
 * failed product save because the cache did not answer would be far worse.
 */
export const runtime = 'nodejs';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;

  // Not configured means the feature is off, not that anything is broken.
  if (!secret) {
    return NextResponse.json({ revalidated: false, reason: 'not configured' }, { status: 503 });
  }

  const presented = request.headers.get('x-revalidate-secret') ?? '';
  if (!safeEqual(presented, secret)) {
    return NextResponse.json({ revalidated: false }, { status: 401 });
  }

  let tags: string[] = [];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20);
    }
  } catch {
    return NextResponse.json({ revalidated: false, reason: 'bad json' }, { status: 400 });
  }

  if (tags.length === 0) {
    return NextResponse.json({ revalidated: false, reason: 'no tags' }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ revalidated: true, tags });
}
