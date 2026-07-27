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
    // Pakistan traffic is mobile-heavy on 3G — favour small, modern formats.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Prepared for future Urdu localisation (currently English-only).
  // i18n routing will be handled by the App Router `[locale]` segment in a later phase.

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
