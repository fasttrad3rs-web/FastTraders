import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

/** Dynamic robots.txt. Account, cart and checkout are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/cart',
          '/inquiry',
          '/checkout',
          '/order-confirmation',
          '/style-guide',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
