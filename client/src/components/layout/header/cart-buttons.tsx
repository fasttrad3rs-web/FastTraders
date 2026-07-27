'use client';

import Link from 'next/link';
import { FileText, ShoppingCart, User } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useCartCount } from '@/store/cart-store';
import { cn } from '@/lib/utils';

/**
 * The two cart entry points plus the account link.
 *
 * Two carts is unusual, so they are visually distinct: the inquiry list uses a
 * document icon and the navy badge, the shopping cart a trolley and cyan.
 */

function IconLink({
  href,
  label,
  count,
  badgeClass,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  badgeClass?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Tooltip content={label}>
      <Link
        href={href}
        aria-label={count ? `${label} (${count} item${count === 1 ? '' : 's'})` : label}
        className="relative flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan [&_svg]:size-5"
      >
        {children}
        {count && count > 0 ? (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[18px] text-white',
              badgeClass,
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Link>
    </Tooltip>
  );
}

export function HeaderActions(): JSX.Element {
  const cartCount = useCartCount('shopping');
  const inquiryCount = useCartCount('inquiry');

  return (
    <div className="flex items-center gap-0.5">
      <IconLink href="/account" label="My account">
        <User />
      </IconLink>

      <IconLink
        href="/inquiry"
        label="Inquiry list"
        count={inquiryCount}
        badgeClass="bg-brand-navy"
      >
        <FileText />
      </IconLink>

      <IconLink
        href="/cart"
        label="Shopping cart"
        count={cartCount}
        badgeClass="bg-brand-cyan"
      >
        <ShoppingCart />
      </IconLink>
    </div>
  );
}
