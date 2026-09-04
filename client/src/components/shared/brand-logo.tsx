import Image from 'next/image';
import { imageProps } from '@/lib/images';
import { cn } from '@/lib/utils';

/**
 * A manufacturer's logo on a white tile.
 *
 * **The tile is not decoration — it is the whole reason this works.** Eight of
 * the twelve logos are dark ink drawn for white stationery (Terasaki, National,
 * Fuji, Mitsubishi, IDEC, DELAB, Pilz and Torex all measure under 110 luma).
 * Dropped straight onto the navy footer they range from low-contrast to
 * completely invisible. Putting every logo on white means each one renders as
 * its owner intended, and it is what trade sites do for exactly this reason.
 *
 * These are third-party trademarks shown as a statement of stockist status.
 * They are never recoloured or altered beyond scaling — `object-contain` only.
 *
 * The file is derived from the brand slug, so `terasaki` → `/brand/logos/terasaki.png`.
 * All lower case, deliberately: macOS is case-insensitive and Vercel's Linux
 * hosts are not, so `Terasaki.png` would work locally and 404 in production.
 */
export function BrandLogo({
  slug,
  name,
  className,
  sizes = '(max-width: 640px) 30vw, 140px',
}: {
  slug: string;
  name: string;
  className?: string;
  sizes?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center rounded-md bg-white p-2.5',
        className,
      )}
    >
      <Image
        {...imageProps(`/brand/logos/${slug}.png`)}
        // The tile already names the brand to assistive tech via the link
        // title, and a logo beside its own name reads twice. Where this is the
        // only label, callers pass a visible name alongside.
        alt={`${name} logo`}
        width={140}
        height={48}
        sizes={sizes}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
