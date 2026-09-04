import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

/** Dynamic robots.txt. The shortlist and the submit form are per-visitor. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/inquiry-list', '/submit-inquiry', '/admin', '/style-guide', '/api/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
