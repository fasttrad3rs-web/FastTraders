'use client';

import Link from 'next/link';
import { ClipboardList, LayoutGrid, MessageCircle, Phone } from 'lucide-react';
import { CONTACT } from '@/lib/constants';
import { trackCall, trackWhatsApp } from '@/lib/analytics';
import { useInquiryCount } from '@/store/inquiry-store';
import { cn } from '@/lib/utils';

/**
 * The mobile action bar.
 *
 * Pakistan's traffic is overwhelmingly mobile, and the conversion here is a
 * phone call — not a form. So the two channels that actually close business
 * sit within thumb reach on every page, always, rather than behind a scroll
 * or a menu. This is the single most important element on the mobile site.
 *
 * Four equal targets, each comfortably past the 44px minimum. Hidden from
 * `lg` up, where the header already carries a large call block.
 *
 * `<body>` gets matching bottom padding from the storefront layout — without
 * it this bar covers the last few lines of every page, which is worst on the
 * footer where the address and numbers live.
 */

export function MobileActionBar(): JSX.Element {
  const count = useInquiryCount();

  return (
    <nav
      aria-label="Quick contact"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-navy lg:hidden',
        // Sits above the iOS home indicator rather than under it.
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="grid grid-cols-4 items-stretch">
        <li>
          <a
            href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`}
            onClick={() =>
              trackCall({ channel: 'mobile', number: CONTACT.mobile, context: 'mobile_bar' })
            }
            className="flex h-16 flex-col items-center justify-center gap-1 bg-brand-cyan text-white transition-colors active:bg-brand-cyan/80"
          >
            <Phone className="size-5" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wide">Call</span>
          </a>
        </li>

        <li>
          <a
            href={`https://wa.me/${CONTACT.whatsappDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsApp({ context: 'generic' })}
            className="flex h-16 flex-col items-center justify-center gap-1 text-white/90 transition-colors active:bg-white/10"
          >
            <MessageCircle className="size-5" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wide">WhatsApp</span>
          </a>
        </li>

        <li>
          <Link
            href="/inquiry-list"
            className="relative flex h-16 flex-col items-center justify-center gap-1 text-white/90 transition-colors active:bg-white/10"
          >
            <span className="relative">
              <ClipboardList className="size-5" aria-hidden />
              {count > 0 ? (
                <span className="absolute -right-2.5 -top-1.5 flex min-w-[17px] items-center justify-center rounded-full bg-brand-cyan px-1 text-[10px] font-bold leading-[17px] text-white">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide">
              List
              <span className="sr-only">
                {count > 0 ? ` (${count} item${count === 1 ? '' : 's'})` : ' (empty)'}
              </span>
            </span>
          </Link>
        </li>

        <li>
          <Link
            href="/categories"
            className="flex h-16 flex-col items-center justify-center gap-1 text-white/90 transition-colors active:bg-white/10"
          >
            <LayoutGrid className="size-5" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wide">Browse</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
