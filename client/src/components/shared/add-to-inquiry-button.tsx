'use client';

import Link from 'next/link';
import { Check, ListPlus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { trackAddToInquiry } from '@/lib/analytics';
import { useInquiryStore, useIsInInquiry } from '@/store/inquiry-store';
import type { Brand, Product } from '@/types';
import type { InquirableProduct } from './types';

/**
 * Add a product to the inquiry list.
 *
 * Not an add-to-cart. Nothing is reserved, nothing is priced, and the button
 * says so — it is a shortlist a buyer builds before asking for one quote
 * covering the lot, which is how a panel builder with a bill of materials
 * actually shops.
 *
 * Once added it flips to a confirmed state rather than disappearing, so the
 * page does not silently change shape under someone's thumb.
 */

export interface AddToInquiryButtonProps
  extends Omit<ButtonProps, 'asChild' | 'children' | 'onClick'> {
  product: InquirableProduct;
  qty?: number;
  note?: string;
  label?: string;
}

function brandName(brand: Product['brand'] | undefined): string | undefined {
  if (!brand || typeof brand === 'string') return undefined;
  return (brand as Brand).name;
}

export function AddToInquiryButton({
  product,
  qty = 1,
  note,
  label = 'Add to Inquiry',
  variant = 'primary',
  size = 'md',
  ...props
}: AddToInquiryButtonProps): JSX.Element {
  const add = useInquiryStore((state) => state.add);
  const alreadyAdded = useIsInInquiry(product.id);

  const handleAdd = (): void => {
    const brand = brandName(product.brand);
    const image = product.images?.[0]?.url;

    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      ...(brand ? { brand } : {}),
      ...(image ? { image } : {}),
      availability: product.availability,
      qty,
      unit: product.unit ?? 'piece',
      ...(note ? { note } : {}),
    });

    trackAddToInquiry({ sku: product.sku, name: product.name, ...(brand ? { brand } : {}), qty });

    toast.success('Added to your inquiry list', {
      description: product.name,
      action: {
        label: 'View list',
        onClick: () => {
          window.location.href = '/inquiry-list';
        },
      },
    });
  };

  if (alreadyAdded) {
    return (
      <Button asChild variant="outline" size={size} {...props}>
        <Link href="/inquiry-list">
          <Check aria-hidden />
          In your list ✓
        </Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleAdd} {...props}>
      <ListPlus aria-hidden />
      {label}
    </Button>
  );
}
