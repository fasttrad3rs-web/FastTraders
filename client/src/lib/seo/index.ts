import type { Metadata } from 'next';
import { SITE } from '@/lib/constants';

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
  const ogImage = image?.startsWith('http') ? image : image ? `${SITE.url}${image}` : undefined;

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
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
