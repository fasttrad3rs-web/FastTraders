'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useInquiryCount } from '@/store/inquiry-store';

/**
 * Header actions.
 *
 * One entry point, not three. The account link and the shopping cart went
 * with the commerce model; what is left is the inquiry list. Calling lives in
 * `<HeaderCallBlock>` beside it, where the number is shown in full rather
 * than hidden behind an icon.
 */
export function HeaderActions(): JSX.Element {
  const count = useInquiryCount();

  return (
    <div className="flex items-center gap-1">
      <Tooltip content="Inquiry list">
        <Link
          href="/inquiry-list"
          aria-label={count > 0 ? `Inquiry list (${count} item${count === 1 ? '' : 's'})` : 'Inquiry list'}
          className="relative flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan [&_svg]:size-5"
        >
          <ClipboardList />
          {count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand-cyan px-1 text-[10px] font-bold leading-[18px] text-white">
              {count > 99 ? '99+' : count}
            </span>
          ) : null}
        </Link>
      </Tooltip>

    </div>
  );
}
