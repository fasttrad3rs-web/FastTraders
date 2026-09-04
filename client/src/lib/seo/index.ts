import type { Metadata } from 'next';
import { SITE } from '@/lib/constants';

/** Branded 1200x630 card used when a page supplies no image of its own. */
export const DEFAULT_OG_IMAGE = '/brand/og-default.png';

export * from './business';
export * from './schema';

/**
 * Build page metadata with the canonical URL, Open Graph and Twitter card
 * filled in consistently. Every dynamic route calls this from
 * `generateMetadata`.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  keywords,
  noIndex,
}: {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. `/products/mccb-250a`. */
  path: string;
  image?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE.url}${path}`;
  /*
   * Every page gets a share card. Most Fast Traders links are pasted into
   * WhatsApp, where a bare URL with no preview reads like spam.
   */
  const resolved = image ?? DEFAULT_OG_IMAGE;
  const ogImage = resolved.startsWith('http') ? resolved : `${SITE.url}${resolved}`;

  return {
    title,
    description,
    ...(keywords ? { keywords: [...keywords] } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
