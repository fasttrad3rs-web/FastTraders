import Image from 'next/image';
import Link from 'next/link';
import { imageProps } from '@/lib/images';
import { cn } from '@/lib/utils';

/**
 * The Fast Traders logo.
 *
 * One component, three lockups, so a brand change lands everywhere at once:
 *
 *   `horizontal` — mark beside the wordmark. Headers and anywhere wide.
 *   `stacked`    — mark above the wordmark. Vertical space, e.g. the sign-in card.
 *   `mark`       — the swirl alone. Tight spots: a collapsed sidebar, an avatar slot.
 *
 * Assets were derived from the client's original `brand/logo.svg`, which wraps
 * a 500×500 PNG and carries a `stroke="black"` frame and a viewBox that does
 * not match its own artwork — rendering it directly draws a black rectangle
 * around a squashed logo. The originals are kept alongside for reference.
 *
 * The wordmark reverses to white inside the artwork, so it reads on both the
 * white header and the navy footer; `variant` only affects the strapline.
 */

/*
 * Two files per lockup. In the artwork the wordmark letters are *knocked out*
 * of the coloured bar rather than painted white — so on the white header they
 * read white, but on the navy footer they would read navy-on-indigo. The
 * `-light` files have that knockout filled with white.
 */
const LOCKUPS = {
  horizontal: {
    dark: '/brand/logo-horizontal.png',
    light: '/brand/logo-horizontal-light.png',
    width: 760,
    height: 198,
  },
  stacked: {
    dark: '/brand/logo.png',
    light: '/brand/logo-light.png',
    width: 414,
    height: 298,
  },
  // The mark has no wordmark, so one file serves both backgrounds.
  mark: {
    dark: '/brand/logo-mark.png',
    light: '/brand/logo-mark.png',
    width: 192,
    height: 198,
  },
} as const;

export type LogoVariant = keyof typeof LOCKUPS;

export function Logo({
  variant = 'dark',
  lockup = 'horizontal',
  className,
  href = '/',
  height = 40,
  priority = false,
  showStrapline = true,
}: {
  /** `dark` for light backgrounds, `light` for the navy footer. */
  variant?: 'dark' | 'light';
  lockup?: LogoVariant;
  className?: string;
  href?: string | null;
  /** Rendered height in px. Width follows the artwork's aspect ratio. */
  height?: number;
  /** Set on the header logo — it is in the LCP viewport on every page. */
  priority?: boolean;
  showStrapline?: boolean;
}): JSX.Element {
  const asset = LOCKUPS[lockup];
  const width = Math.round((asset.width / asset.height) * height);

  const content = (
    <span className={cn('inline-flex flex-col items-start leading-none', className)}>
      <Image
        // Local assets, so the guard is a formality here — but routing every
        // `<Image>` through one helper is what makes the rule checkable.
        {...imageProps(variant === 'light' ? asset.light : asset.dark)}
        alt="Fast Traders"
        width={width}
        height={height}
        priority={priority}
        // Sized in CSS from the height prop; `w-auto` keeps the ratio honest.
        className="h-[var(--logo-h)] w-auto"
        style={{ '--logo-h': `${height}px` } as React.CSSProperties}
      />

      {showStrapline && lockup !== 'mark' ? (
        <span
          className={cn(
            'mt-1 text-[9px] font-medium uppercase tracking-[0.18em]',
            variant === 'dark' ? 'text-muted-foreground' : 'text-white/60',
          )}
        >
          Industrial &amp; Electrical
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="Fast Traders — home" className="shrink-0">
      {content}
    </Link>
  );
}
