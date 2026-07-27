import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ProductImage as ProductImageType } from '@/types';

/**
 * Product image with a branded fallback.
 *
 * Seeded products carry a local SVG placeholder (`publicId` starts with
 * `placeholder/`). When one is shown we overlay the SKU, so a catalogue
 * awaiting photography still reads as a real product rather than a blank tile.
 */
export function ProductImage({
  image,
  sku,
  sizes,
  priority,
  className,
  fill = true,
}: {
  image?: ProductImageType;
  sku: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
}): JSX.Element {
  const src = image?.url ?? '/placeholders/default.svg';
  const isPlaceholder = !image || image.publicId.startsWith('placeholder/');

  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      <Image
        src={src}
        alt={image?.alt ?? `${sku} — product image`}
        {...(fill ? { fill: true } : { width: 600, height: 600 })}
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />

      {isPlaceholder ? (
        <span className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded bg-brand-navy/90 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white">
            {sku}
          </span>
        </span>
      ) : null}
    </div>
  );
}
