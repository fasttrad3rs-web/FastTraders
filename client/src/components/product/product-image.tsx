import Image from 'next/image';
import { BrandLogo } from '@/components/shared/brand-logo';
import { imageProps } from '@/lib/images';
import { cn } from '@/lib/utils';
import type { ProductImage as ProductImageType } from '@/types';

/**
 * Product image with a branded fallback.
 *
 * Seeded products carry a local SVG placeholder (`publicId` starts with
 * `placeholder/`). When one is shown we overlay the SKU, so a catalogue
 * awaiting photography still reads as a real product rather than a blank tile.
 *
 * On a placeholder we also show the **manufacturer's logo**. Until Sharjeel
 * supplies photography every breaker in a category shares one generic outline,
 * so a grid of them is indistinguishable — and the first thing a panel builder
 * looks for is not the shape of the thing, it is who made it. Terasaki and
 * Schneider are the reason they are on the page. The logo is the single most
 * useful piece of information we can put on a tile that has no photo.
 *
 * It is deliberately a small chip rather than the whole tile: the category line
 * art stays visible behind it, so the tile still reads as "awaiting photo"
 * rather than pretending a logo is a product shot.
 */
export function ProductImage({
  image,
  sku,
  sizes,
  priority,
  className,
  fill = true,
  brand,
}: {
  image?: ProductImageType;
  sku: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  /** Populated brand, when the caller has one. Ignored for real photography. */
  brand?: { name: string; slug: string } | null;
}): JSX.Element {
  const resolved = imageProps(image?.url);
  const isPlaceholder = !image || image.publicId.startsWith('placeholder/');

  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      <Image
        {...resolved}
        alt={image?.alt ?? `${sku} — product image`}
        {...(fill ? { fill: true } : { width: 600, height: 600 })}
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />

      {isPlaceholder ? (
        <>
          <span className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded bg-brand-navy/90 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white">
              {sku}
            </span>
          </span>

          {brand ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
              <span className="flex h-7 w-[58%] max-w-[140px] items-center justify-center rounded border border-border/70 bg-white/95 px-2 shadow-sm">
                <BrandLogo
                  slug={brand.slug}
                  name={brand.name}
                  className="bg-transparent p-0"
                  sizes="140px"
                />
              </span>
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
