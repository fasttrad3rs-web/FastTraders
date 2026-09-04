import { Clock, Mail, MapPin, Navigation } from 'lucide-react';
import { CallButton } from './call-button';
import { WhatsAppButton } from './whatsapp-button';
import { BUSINESS_HOURS, CONTACT, MAP_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * The contact block, used in the footer, on /contact and on the homepage.
 *
 * One component because these details change — a landline gets ported, the
 * shop moves down the road — and three hand-maintained copies drift. It also
 * means the click-to-call and WhatsApp instrumentation is identical wherever
 * someone reaches for it, so the GA4 numbers compare.
 *
 * Both numbers are always shown. The mobile is the one that gets answered,
 * but a procurement officer at a large firm will often prefer to ring a
 * landline, and the absence of one reads as a man with a van.
 */

export type ContactCardVariant = 'default' | 'compact' | 'dark';

export interface ContactCardProps {
  variant?: ContactCardVariant;
  /** Hide the call/WhatsApp buttons — for the footer, where they duplicate. */
  actions?: boolean;
  showHours?: boolean;
  showMap?: boolean;
  className?: string;
}

export function ContactCard({
  variant = 'default',
  actions = true,
  showHours = true,
  showMap = true,
  className,
}: ContactCardProps): JSX.Element {
  const dark = variant === 'dark';
  const compact = variant === 'compact';

  const label = dark ? 'text-white/50' : 'text-muted-foreground';
  const value = dark ? 'text-white' : 'text-foreground';
  const link = dark ? 'text-white hover:text-brand-cyan' : 'text-brand-navy hover:text-brand-cyan';

  return (
    <div className={cn('space-y-4', compact && 'space-y-3', className)}>
      <address className="not-italic space-y-3">
        <div className="flex gap-2.5">
          <MapPin className={cn('mt-0.5 size-4 shrink-0', dark ? 'text-brand-cyan' : 'text-brand-cyan')} aria-hidden />
          <div className="text-sm leading-relaxed">
            <p className={cn('font-semibold', value)}>{CONTACT.address.line1}</p>
            <p className={label}>
              {CONTACT.address.line2}, {CONTACT.address.city}, {CONTACT.address.country}
            </p>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className={cn('text-2xs uppercase tracking-wide', label)}>Mobile / WhatsApp</dt>
            <dd>
              <a
                href={`tel:${CONTACT.mobile.replace(/[^\d+]/g, '')}`}
                className={cn('font-mono text-sm font-semibold', link)}
              >
                {CONTACT.mobile}
              </a>
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className={cn('text-2xs uppercase tracking-wide', label)}>Landline</dt>
            <dd>
              <a
                href={`tel:${CONTACT.landline.replace(/[^\d+]/g, '')}`}
                className={cn('font-mono text-sm font-semibold', link)}
              >
                {CONTACT.landline}
              </a>
            </dd>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className={cn('text-2xs uppercase tracking-wide', label)}>Email</dt>
            <dd className="flex items-center gap-1.5">
              <Mail className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
              <a href={`mailto:${CONTACT.email}`} className={cn('text-sm', link)}>
                {CONTACT.email}
              </a>
            </dd>
          </div>
        </dl>
      </address>

      {showHours ? (
        <div className="flex gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
          <ul className="space-y-0.5 text-2xs">
            {BUSINESS_HOURS.map((entry) => (
              <li key={entry.days} className="flex flex-wrap gap-x-2">
                <span className={cn('font-medium', value)}>{entry.days}</span>
                <span className={label}>{entry.hours}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showMap ? (
        <a
          href={MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('inline-flex items-center gap-1.5 text-xs font-medium', link)}
        >
          <Navigation className="size-3.5" aria-hidden />
          Get directions
        </a>
      ) : null}

      {actions ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <CallButton size="sm" context="contact_card" />
          <WhatsAppButton size="sm" />
        </div>
      ) : null}
    </div>
  );
}
