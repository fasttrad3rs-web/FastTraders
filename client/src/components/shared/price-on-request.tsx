'use client';

import { AddToInquiryButton } from './add-to-inquiry-button';
import { AvailabilityBadge } from './availability-badge';
import { CallButton } from './call-button';
import { WhatsAppButton } from './whatsapp-button';
import { cn } from '@/lib/utils';
import type { InquirableProduct } from './types';

/**
 * The block that stands where a price would be.
 *
 * This is the most important component on the site. Fast Traders prices
 * against quantity, the dollar rate and what the supplier is asking that
 * week, so a printed number would be wrong within days and would lose the
 * negotiation that this trade runs on.
 *
 * An empty space where a price belongs reads as a broken page, so the slot is
 * filled with the reason and the three ways to get an answer. The subtext is
 * not an apology — "we quote based on quantity and current stock" is a
 * promise that asking is worth it.
 */

export type PriceOnRequestSize = 'sm' | 'md' | 'lg';

const SCALE: Record<PriceOnRequestSize, { heading: string; sub: string; button: 'sm' | 'md' }> = {
  sm: { heading: 'text-base', sub: 'text-2xs', button: 'sm' },
  md: { heading: 'text-xl', sub: 'text-xs', button: 'sm' },
  lg: { heading: 'text-2xl', sub: 'text-sm', button: 'md' },
};

export interface PriceOnRequestProps {
  product: InquirableProduct;
  size?: PriceOnRequestSize;
  /** Hide the three buttons — for a grid card where the whole tile is a link. */
  actions?: boolean;
  qty?: number;
  className?: string;
}

export function PriceOnRequest({
  product,
  size = 'md',
  actions = true,
  qty = 1,
  className,
}: PriceOnRequestProps): JSX.Element {
  const scale = SCALE[size];
  const discontinued = product.availability === 'discontinued';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <p className={cn('font-heading font-bold text-brand-cyan', scale.heading)}>
          Price on Request
        </p>
        <p className={cn('text-muted-foreground', scale.sub)}>
          We quote based on quantity and current stock
        </p>
      </div>

      <AvailabilityBadge
        value={product.availability}
        {...(product.leadTime ? { leadTime: product.leadTime } : {})}
        size={size === 'lg' ? 'md' : 'sm'}
      />

      {actions ? (
        <div className="flex flex-wrap gap-2">
          <CallButton
            size={scale.button}
            context="price_on_request"
            sku={product.sku}
            label="Call Now"
          />
          <WhatsAppButton
            size={scale.button}
            product={{
              name: product.name,
              sku: product.sku,
              qty,
              ...(product.unit ? { unit: product.unit } : {}),
            }}
          />
          {/*
            A discontinued line still gets a call and a WhatsApp button —
            people search obsolete part numbers looking for a replacement, and
            that conversation is worth having. Shortlisting it is not: there
            is nothing to quote.
          */}
          {discontinued ? null : (
            <AddToInquiryButton
              product={product}
              qty={qty}
              size={scale.button}
              variant="outline"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
