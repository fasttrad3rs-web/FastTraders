'use client';

import { Phone } from 'lucide-react';
import { CONTACT } from '@/lib/constants';
import { trackCall } from '@/lib/analytics';

/**
 * The header's call block.
 *
 * Phone visibility is the primary conversion goal of this site, so on desktop
 * the number is not a button with a phone icon — it is the number itself, set
 * large enough to read from across a desk and to write down without squinting.
 *
 * Local format (`0324 4234990`) rather than E.164: this is what a Pakistani
 * buyer recognises and dials. The `tel:` href underneath uses the full
 * international form so it still works for anyone abroad or roaming.
 *
 * Hidden below `lg`, where the mobile action bar carries the same action with
 * a bigger target.
 */

/** `+92 324 4234990` → `0324 4234990`. */
function toLocal(international: string): string {
  return international.replace(/^\+92\s?/, '0');
}

export function HeaderCallBlock(): JSX.Element {
  return (
    <a
      href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`}
      onClick={() => trackCall({ channel: 'mobile', number: CONTACT.mobile, context: 'header' })}
      className="hidden shrink-0 items-center gap-3 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-2 transition-colors hover:border-brand-cyan hover:bg-brand-cyan/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan lg:flex"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-cyan text-white">
        <Phone className="size-4" aria-hidden />
      </span>

      <span className="flex flex-col leading-tight">
        <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Call for best price
        </span>
        <span className="font-heading text-lg font-extrabold tracking-tight text-brand-navy">
          {toLocal(CONTACT.mobile)}
        </span>
      </span>
    </a>
  );
}
