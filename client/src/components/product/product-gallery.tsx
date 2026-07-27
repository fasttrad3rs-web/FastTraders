'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductImage as ProductImageType } from '@/types';

/**
 * Product gallery: large image with hover zoom, plus a thumbnail rail.
 *
 * Zoom is a CSS `transform-origin` follow rather than a lightbox — a trade
 * buyer usually wants to read the rating plate, and that works on touch too.
 */
export function ProductGallery({
  images,
  name,
  sku,
}: {
  images: ProductImageType[];
  name: string;
  sku: string;
}): JSX.Element {
  const gallery = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  const current = gallery[active];
  const src = current?.url ?? '/placeholders/default.svg';
  const isPlaceholder = !current || current.publicId.startsWith('placeholder/');

  const onMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-white"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
      >
        <Image
          src={src}
          alt={current?.alt ?? `${name} — ${sku}`}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
          className={cn(
            'object-contain transition-transform duration-200',
            zooming && !isPlaceholder && 'scale-[1.8]',
          )}
          style={{ transformOrigin: origin }}
        />

        {isPlaceholder ? (
          <span className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="rounded bg-brand-navy/90 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-white">
              {sku}
            </span>
          </span>
        ) : (
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded bg-brand-navy/80 px-2 py-1 text-2xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3" />
            Hover to zoom
          </span>
        )}
      </div>

      {gallery.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <li key={image.publicId}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${gallery.length}`}
                aria-current={index === active}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors',
                  index === active ? 'border-brand-cyan' : 'border-border hover:border-brand-navy/40',
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
