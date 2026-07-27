'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STORAGE_KEYS } from '@/lib/constants';
import { formatPKR } from '@/lib/utils';
import { ProductImage } from './product-image';
import type { Product } from '@/types';

/**
 * Recently viewed rail.
 *
 * Stored in localStorage rather than on the server — it is a browsing
 * convenience, not account data, and this keeps it working for guests without
 * a round trip.
 */

interface ViewedItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  price?: number;
}

const MAX_ITEMS = 8;

function read(): ViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recentlyViewed);
    return raw ? (JSON.parse(raw) as ViewedItem[]) : [];
  } catch {
    return [];
  }
}

/** Records the current product and renders everything viewed before it. */
export function RecentlyViewed({ current }: { current: Product }): JSX.Element | null {
  const [items, setItems] = useState<ViewedItem[]>([]);

  useEffect(() => {
    const previous = read().filter((item) => item.id !== current.id);
    setItems(previous.slice(0, MAX_ITEMS));

    const entry: ViewedItem = {
      id: current.id,
      name: current.name,
      slug: current.slug,
      sku: current.sku,
      ...(current.images[0]?.url ? { image: current.images[0].url } : {}),
      ...(typeof current.price === 'number' ? { price: current.price } : {}),
    };

    try {
      localStorage.setItem(
        STORAGE_KEYS.recentlyViewed,
        JSON.stringify([entry, ...previous].slice(0, MAX_ITEMS)),
      );
    } catch {
      // Private browsing or a full quota — the rail simply stays empty.
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
        Recently viewed
      </h2>
      <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />

      <ul className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className="w-40 shrink-0">
            <Link
              href={`/products/${item.slug}`}
              className="block rounded-lg border border-border bg-white p-3 transition-shadow hover:shadow-card"
            >
              <ProductImage
                image={item.image ? { url: item.image, publicId: 'seen', alt: item.name, isPrimary: true } : undefined}
                sku={item.sku}
                sizes="160px"
                className="aspect-square rounded"
              />
              <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">{item.name}</p>
              <p className="mt-1 text-xs font-bold text-brand-navy">
                {typeof item.price === 'number' ? formatPKR(item.price) : 'On request'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
