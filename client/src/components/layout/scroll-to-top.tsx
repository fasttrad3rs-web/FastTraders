'use client';

import { ArrowUp } from 'lucide-react';
import { useScrollPosition } from '@/hooks/use-scroll-position';

/** Appears after a screen and a half of scrolling; sits above the WhatsApp bubble. */
export function ScrollToTop(): JSX.Element | null {
  const scrollY = useScrollPosition();

  if (scrollY < 600) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-40 right-4 z-header flex size-11 items-center justify-center rounded-full border border-border bg-white text-brand-navy shadow-panel transition-colors hover:bg-brand-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan lg:bottom-24"
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
