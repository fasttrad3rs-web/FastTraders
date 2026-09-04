'use client';

import { MessageCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { trackWhatsApp } from '@/lib/analytics';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';
import type { InquiryItem } from '@/store/inquiry-store';

/**
 * WhatsApp, with the message already written.
 *
 * For a lot of trade buyers in Lahore this is the preferred channel, and it
 * converts better than any form. The whole value is in the prefill: a buyer
 * who has to type out four part numbers on a phone keyboard sends "price?"
 * instead, and then somebody has to ring back to find out what for.
 *
 * Three contexts, in precedence order: an explicit message, a shortlist, a
 * single product, or the generic opener.
 */

export interface WhatsAppButtonProps extends Omit<ButtonProps, 'asChild' | 'children'> {
  /** Single-product context. */
  product?: { name: string; sku: string; qty?: number; unit?: string };
  /** Shortlist context. Wins over `product` when both are given. */
  items?: InquiryItem[];
  /** Overrides everything. */
  message?: string;
  label?: string;
  iconOnly?: boolean;
}

const GENERIC = "Hi Fast Traders, I'd like to enquire about a product.";

function productMessage(product: NonNullable<WhatsAppButtonProps['product']>): string {
  const quantity =
    product.qty && product.qty > 1
      ? ` I need ${product.qty} ${product.unit ?? 'piece'}${product.qty > 1 ? 's' : ''}.`
      : '';

  return (
    `Hi Fast Traders, I'm interested in ${product.name} (SKU: ${product.sku}). ` +
    `Could you share the price and availability?${quantity}`
  );
}

/**
 * A numbered list. Numbered rather than bulleted because WhatsApp does not
 * render markdown bullets, and because a buyer quoting back "item 3" is how
 * these conversations actually go.
 */
function listMessage(items: InquiryItem[]): string {
  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.name} (SKU: ${item.sku}) — ${item.qty} ${item.unit}` +
      (item.note ? ` [${item.note}]` : ''),
  );

  return [
    "Hi Fast Traders, I'd like a price for the following:",
    '',
    ...lines,
    '',
    'Please share availability and lead time.',
  ].join('\n');
}

export function WhatsAppButton({
  product,
  items,
  message,
  label = 'WhatsApp',
  iconOnly = false,
  className,
  size = 'md',
  variant = 'cta',
  ...props
}: WhatsAppButtonProps): JSX.Element {
  const hasList = items !== undefined && items.length > 0;

  const text = message ?? (hasList ? listMessage(items) : product ? productMessage(product) : GENERIC);
  const context = hasList ? 'list' : product ? 'product' : 'generic';

  return (
    <Button
      asChild
      size={iconOnly ? 'icon' : size}
      variant={variant}
      // WhatsApp green overrides the brand palette here on purpose: people
      // recognise the colour faster than they read the label.
      className={['bg-[#25D366] text-white hover:bg-[#1da851]', className].filter(Boolean).join(' ')}
      aria-label={iconOnly ? label : undefined}
      {...props}
    >
      <a
        href={whatsappLink(CONTACT.whatsappDigits, text)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackWhatsApp({
            context,
            ...(product?.sku ? { sku: product.sku } : {}),
            ...(hasList ? { itemCount: items.length } : {}),
          })
        }
      >
        <MessageCircle aria-hidden />
        {iconOnly ? <span className="sr-only">{label}</span> : label}
      </a>
    </Button>
  );
}
