import { cn } from '@/lib/utils';

/**
 * The flag of the People's Republic of China, drawn inline.
 *
 * Three deliberate choices:
 *
 *   - **Not the 🇨🇳 emoji.** Windows has never shipped flag glyphs, so a large
 *     share of desktop buyers would see the letters "CN" in a box instead.
 *   - **Not a file in /public.** `next/image` is configured without
 *     `dangerouslyAllowSVG`, and a raster flag at this size would be soft on a
 *     retina screen. Inline vector costs one request fewer and stays crisp.
 *   - **Not a client component.** It is markup, not behaviour, so it ships no
 *     JavaScript — this sits on the homepage, which loads on 3G.
 *
 * Geometry follows the official 30×20 construction: the large star is centred
 * at (5,5) with a circumscribed radius of 3, and each of the four small stars
 * has one point aimed at its centre.
 *
 * Purely decorative — every placement sits beside the words "Source from
 * China", so announcing it again would just be noise for a screen reader.
 */
export function ChinaFlag({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn('h-4 w-6 shrink-0', className)}
    >
      {/* Rounded on the rect itself, so no CSS clipping is relied upon. */}
      <rect width="30" height="20" rx="1.5" fill="#EE1C25" />

      <g fill="#FFDE00">
        <polygon points="5.000,2.000 5.674,4.073 7.853,4.073 6.090,5.354 6.763,7.427 5.000,6.146 3.237,7.427 3.910,5.354 2.147,4.073 4.326,4.073" />
        <polygon points="9.143,2.514 9.620,1.966 9.246,1.343 9.914,1.628 10.391,1.080 10.328,1.803 10.996,2.088 10.288,2.251 10.224,2.975 9.851,2.352" />
        <polygon points="11.010,4.141 11.662,3.821 11.560,3.102 12.065,3.624 12.718,3.304 12.378,3.946 12.884,4.467 12.168,4.343 11.829,4.985 11.726,4.266" />
        <polygon points="11.038,6.725 11.765,6.699 11.964,6.001 12.213,6.683 12.939,6.657 12.367,7.105 12.616,7.787 12.014,7.382 11.442,7.830 11.641,7.131" />
        <polygon points="9.219,8.375 9.899,8.632 10.353,8.064 10.319,8.790 10.999,9.046 10.298,9.239 10.265,9.964 9.865,9.357 9.165,9.550 9.618,8.982" />
      </g>

      {/*
        A hairline so the red field does not float on a coloured background.
        `currentColor` means it darkens on white and lightens on the navy band
        without either caller having to say so.
      */}
      <rect
        x="0.25"
        y="0.25"
        width="29.5"
        height="19.5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="0.5"
      />
    </svg>
  );
}
