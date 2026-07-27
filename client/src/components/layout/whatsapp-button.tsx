'use client';

import { MessageCircle } from 'lucide-react';
import { CONTACT } from '@/lib/constants';
import { cn, whatsappLink } from '@/lib/utils';

const DEFAULT_MESSAGE =
  'Hello Fast Traders, I would like to enquire about industrial equipment.';

/** Inline WhatsApp call-to-action for the header. */
export function WhatsAppButton({
  message = DEFAULT_MESSAGE,
  className,
}: {
  message?: string;
  className?: string;
}): JSX.Element {
  return (
    <a
      href={whatsappLink(CONTACT.whatsappDigits, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1da851] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2',
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden />
      <span className="hidden xl:inline">WhatsApp</span>
      <span className="hidden sm:inline xl:hidden">Chat</span>
      <span className="sr-only sm:not-sr-only sm:hidden">WhatsApp us</span>
    </a>
  );
}

/**
 * Floating WhatsApp bubble.
 * Sits above the mobile bottom nav (`bottom-24`) so the two never overlap.
 */
export function FloatingWhatsApp({ message = DEFAULT_MESSAGE }: { message?: string }): JSX.Element {
  return (
    <a
      href={whatsappLink(CONTACT.whatsappDigits, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Fast Traders on WhatsApp"
      className="fixed bottom-24 right-4 z-header flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-panel transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden />
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#25D366] opacity-20" aria-hidden />
    </a>
  );
}
