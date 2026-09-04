/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Fail the production build on type or lint errors — never ship broken types.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  images: {
    remotePatterns: [
      // Cloudinary hosts all real product and banner imagery.
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],

    /*
     * `dangerouslyAllowSVG` is deliberately NOT set. The optimizer 400s on
     * `image/svg+xml`, so the branded placeholders bypass it entirely via
     * `unoptimized` — see `isVectorAsset` in src/lib/images.ts. A 2 kB vector
     * has nothing to optimise, and leaving the flag off means no SVG from any
     * remote host is ever served through /_next/image.
     */
    // Pakistan traffic is mobile-heavy on 3G — favour small, modern formats.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Prepared for future Urdu localisation (currently English-only).
  // i18n routing will be handled by the App Router `[locale]` segment in a later phase.

  /*
   * `/sourcing-request` became `/source-from-china` when the service was
   * renamed. Nothing is deployed yet, but the old path may already be in a
   * WhatsApp message or a browser history, and a 301 costs nothing. Permanent
   * so search engines transfer the page rather than index both.
   */
  async redirects() {
    return [
      {
        source: '/sourcing-request',
        destination: '/source-from-china',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
