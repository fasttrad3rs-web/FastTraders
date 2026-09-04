import type { MetadataRoute } from 'next';

/**
 * Web app manifest.
 *
 * This audience is overwhelmingly on Android, and a trade buyer who deals with
 * Fast Traders regularly will "Add to Home Screen" if the browser offers it.
 * Without a manifest Chrome either does not offer it at all or creates a
 * shortcut with a generic icon and the raw URL as its name.
 *
 * It is also what `icon-32.png` and `icon-512.png` are for — both were sitting
 * in `public/brand` unreferenced by anything.
 *
 * `display: 'browser'` on purpose. Standalone mode hides the address bar,
 * which is the wrong trade for a catalogue: people share product pages over
 * WhatsApp constantly, and they need a visible URL to copy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fast Traders — Industrial & Electrical Equipment',
    short_name: 'Fast Traders',
    description:
      'Circuit breakers, cables, switchgear, drives and automation parts. Lahore counter, nationwide delivery.',
    start_url: '/',
    display: 'browser',
    background_color: '#F7F9FC',
    theme_color: '#1B2A6B',
    lang: 'en',
    categories: ['business', 'shopping'],
    icons: [
      { src: '/brand/icon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        // `maskable` lets Android crop to its own shape without clipping the
        // mark; without one, the icon gets a white box around it on some
        // launchers.
        src: '/brand/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
