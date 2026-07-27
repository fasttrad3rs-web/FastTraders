import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { ContactForm } from '@/components/shared/contact-form';
import { MAP_EMBED_SRC } from '@/components/home/contact-strip';
import { breadcrumbSchema, buildMetadata, localBusinessSchema, organizationSchema } from '@/lib/seo';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Fast Traders — Grace Tower, Bull Road, Lahore',
  description:
    'Visit our counter at Shop No. 30, Grace Tower, Bull Road, Lahore. Call +92 324 4234990 or +92 42 37378460, or email fasttrad3rs@gmail.com.',
  path: '/contact',
  keywords: ['electrical shop Bull Road Lahore', 'industrial equipment supplier contact Lahore'],
});

const HOURS = [
  { days: 'Monday – Thursday', time: '10:00 – 19:00' },
  { days: 'Friday', time: '10:00 – 19:00', note: 'Closed 13:00 – 14:30 for Jumu’ah' },
  { days: 'Saturday', time: '10:00 – 19:00' },
  { days: 'Sunday', time: 'Closed' },
];

export default function ContactPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd
        schemas={[organizationSchema(), localBusinessSchema(), breadcrumbSchema([{ name: 'Contact', path: '/contact' }])]}
      />

      <Breadcrumb items={[{ label: 'Contact' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Contact Us
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Call, WhatsApp, email, or come to the counter. If you have the part number, WhatsApp is
        fastest — we will confirm stock and price straight away.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Send us a message
          </h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Fast Traders
            </h2>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <address className="not-italic text-muted-foreground">
                  {CONTACT.address.line1},<br />
                  {CONTACT.address.line2}, {CONTACT.address.city},<br />
                  {CONTACT.address.country}
                </address>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <span className="text-muted-foreground">
                  <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="block hover:text-brand-cyan">
                    {CONTACT.mobile} <span className="text-2xs uppercase">Mobile / WhatsApp</span>
                  </a>
                  <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="block hover:text-brand-cyan">
                    {CONTACT.landline} <span className="text-2xs uppercase">Landline</span>
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="text-muted-foreground hover:text-brand-cyan">
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <dl className="space-y-1 text-muted-foreground">
                  {HOURS.map((entry) => (
                    <div key={entry.days} className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-foreground">{entry.days}</dt>
                      <dd>{entry.time}</dd>
                      {entry.note ? <dd className="w-full text-2xs">{entry.note}</dd> : null}
                    </div>
                  ))}
                </dl>
              </li>
            </ul>

            <Button asChild variant="cta" block className="mt-5">
              <a
                href={whatsappLink(CONTACT.whatsappDigits, 'Hello Fast Traders, I have an enquiry.')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp us
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={MAP_EMBED_SRC}
              title="Fast Traders on Google Maps — Grace Tower, Bull Road, Lahore"
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
