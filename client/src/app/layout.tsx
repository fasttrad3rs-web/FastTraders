import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { SITE } from '@/lib/constants';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Industrial & Electrical Equipment, Lahore`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  keywords: [
    'industrial equipment Lahore',
    'electrical equipment Pakistan',
    'circuit breakers Lahore',
    'MCB MCCB ACB supplier',
    'Schneider Electric Pakistan',
    'PLC HMI VFD Lahore',
  ],
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A6B',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-toast rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to content
        </a>

        {/* Storefront chrome lives in app/(storefront)/layout.tsx; the admin
            route group supplies its own shell instead. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
