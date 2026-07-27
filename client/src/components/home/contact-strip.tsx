import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

/** Google Maps embed for Grace Tower, Bull Road, Lahore. */
export const MAP_EMBED_SRC =
  'https://www.google.com/maps?q=Grace+Tower,+Bull+Road,+Lahore,+Pakistan&output=embed';

/** Closing CTA: map on one side, the full contact card on the other. */
export function ContactStrip(): JSX.Element {
  return (
    <section className="bg-brand-dark text-white">
      <div className="container grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">Visit or call</p>
          <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Come to the counter, or send us the part number
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            We are on Bull Road in Lahore, six days a week. If you know the part number, WhatsApp it
            and we will confirm stock and price straight away.
          </p>

          <ul className="mt-7 space-y-3.5 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">{CONTACT.address.full}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">
                <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="hover:text-brand-cyan">
                  {CONTACT.mobile}
                </a>
                <span className="mx-2 text-white/25">·</span>
                <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="hover:text-brand-cyan">
                  {CONTACT.landline}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <a href={`mailto:${CONTACT.email}`} className="text-white/80 hover:text-brand-cyan">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">
                Monday – Saturday, 10:00 – 19:00 · Closed Sunday
              </span>
            </li>
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="cta" size="lg">
              <a
                href={whatsappLink(
                  CONTACT.whatsappDigits,
                  'Hello Fast Traders, I would like to check stock and pricing.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp us
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/contact">Contact page</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <iframe
            src={MAP_EMBED_SRC}
            title="Fast Traders on Google Maps — Grace Tower, Bull Road, Lahore"
            width="100%"
            height="380"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block border-0"
          />
        </div>
      </div>
    </section>
  );
}
