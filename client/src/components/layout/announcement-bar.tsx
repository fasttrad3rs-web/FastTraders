'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useUiStore } from '@/store/ui-store';

/**
 * Announcement strip.
 * The copy comes from Settings in Phase 6; the props keep that swap trivial.
 * Dismissal is per-session on purpose — a promotion the customer dismissed on
 * Monday should still be visible next week.
 */
export function AnnouncementBar({
  text,
  link,
}: {
  text?: string;
  link?: string;
}): JSX.Element | null {
  const dismissed = useUiStore((state) => state.announcementDismissed);
  const dismiss = useUiStore((state) => state.dismissAnnouncement);

  if (!text || dismissed) return null;

  return (
    <div className="relative bg-brand-cyan text-white">
      <div className="container flex items-center justify-center gap-2 py-2 pr-8 text-center text-xs font-medium sm:text-sm">
        {link ? (
          <Link href={link} className="underline-offset-2 hover:underline">
            {text}
          </Link>
        ) : (
          <span>{text}</span>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
