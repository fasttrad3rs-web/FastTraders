import { Facebook, Instagram, Linkedin, Mail, Phone } from 'lucide-react';
import { CONTACT, SITE } from '@/lib/constants';

/**
 * Tier 1 of the header: navy strip carrying the tagline and the two ways
 * Pakistani trade customers actually make contact — phone and email.
 * Hidden below `lg`; the mobile drawer surfaces the same details.
 */
export function TopStrip(): JSX.Element {
  return (
    <div className="hidden bg-brand-dark text-white lg:block">
      <div className="container flex h-9 items-center justify-between text-xs">
        <p className="font-medium tracking-wide text-white/80">{SITE.tagline}</p>

        <div className="flex items-center gap-5">
          <a
            href={`tel:${CONTACT.landline.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cyan"
          >
            <Phone className="size-3.5" aria-hidden />
            {CONTACT.landline}
          </a>

          <a
            href={`mailto:${CONTACT.email}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cyan"
          >
            <Mail className="size-3.5" aria-hidden />
            {CONTACT.email}
          </a>

          <div className="flex items-center gap-2 border-l border-white/15 pl-5">
            {[
              { Icon: Facebook, label: 'Facebook', href: '#' },
              { Icon: Instagram, label: 'Instagram', href: '#' },
              { Icon: Linkedin, label: 'LinkedIn', href: '#' },
            ].map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={`Fast Traders on ${label}`}
                className="rounded p-1 text-white/70 transition-colors hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
