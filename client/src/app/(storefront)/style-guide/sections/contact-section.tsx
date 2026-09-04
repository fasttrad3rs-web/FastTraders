'use client';

import { SectionHeading } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { AvailabilityBadge, CallButton, WhatsAppButton } from '@/components/shared';
import type { InquirableProduct } from '@/components/shared';
import { ContactSectionPart2 } from './contact-section.part2';
import { Row } from './row';
import type { Availability, Product } from '@/types';

/**
 * The contact surface, every component in every variant.
 *
 * This is the section worth checking after any change: these six components
 * are the entire conversion path, and a broken `tel:` href or a WhatsApp
 * prefill that lost its line breaks costs real inquiries.
 */

const AVAILABILITIES: Availability[] = [
  'ready_stock',
  'available_on_order',
  'import_on_request',
  'discontinued',
];

const LEAD_TIMES: Partial<Record<Availability, string>> = {
  ready_stock: 'Collect today from Bull Road',
  available_on_order: '5-7 working days',
  import_on_request: '3-4 weeks (imported)',
};

/** A realistic product. Note the complete absence of any price field. */
function sample(availability: Availability): InquirableProduct {
  return {
    id: `demo-${availability}`,
    slug: 'terasaki-tembreak-2-s250-nj-3p-250a-mccb',
    name: 'Terasaki TemBreak 2 S250-NJ 3P 250A MCCB',
    sku: 'TER-S250NJ-3P250',
    availability,
    brand: { id: 'b1', name: 'Terasaki', slug: 'terasaki' } as Product['brand'],
    images: [],
    unit: 'piece',
    ...(LEAD_TIMES[availability] ? { leadTime: LEAD_TIMES[availability] } : {}),
  };
}



export function ContactSection(): JSX.Element {
  return (
    <section id="contact" className="scroll-mt-24">
      <SectionHeading title="Contact Components" />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Every route from &ldquo;I want this&rdquo; to &ldquo;I have asked&rdquo;. All of them fire a
        GA4 event; all of them no-op safely when gtag is absent.
      </p>

      {/* ------------------------------ CallButton ----------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          CallButton
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Fires <code className="font-mono">contact_call</code>. `tel:` strips spaces; the label
          keeps them, because that is what a person recognises.
        </p>

        <Row label="variant=mobile (default)">
          <CallButton context="style_guide" />
          <CallButton context="style_guide" buttonVariant="cta" />
          <CallButton context="style_guide" buttonVariant="outline" />
          <CallButton context="style_guide" buttonVariant="ghost" />
        </Row>

        <Row label="variant=landline">
          <CallButton variant="landline" context="style_guide" />
          <CallButton variant="landline" buttonVariant="outline" context="style_guide" />
        </Row>

        <Row label="sizes">
          <CallButton size="sm" context="style_guide" />
          <CallButton size="md" context="style_guide" />
          <CallButton size="lg" context="style_guide" />
        </Row>

        <Row label="custom label · custom number · icon only">
          <CallButton label="Call Now" context="style_guide" />
          <CallButton number="+92 300 1234567" label="Call the workshop" context="style_guide" />
          <CallButton iconOnly context="style_guide" />
          <CallButton iconOnly variant="landline" buttonVariant="outline" context="style_guide" />
        </Row>
      </Card>

      {/* ---------------------------- WhatsAppButton --------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          WhatsAppButton
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Fires <code className="font-mono">contact_whatsapp</code>. The whole value is the
          prefill — a buyer who has to type four part numbers on a phone sends
          &ldquo;price?&rdquo; instead.
        </p>

        <Row label="generic — “Hi Fast Traders, I'd like to enquire about a product.”">
          <WhatsAppButton />
          <WhatsAppButton size="sm" />
          <WhatsAppButton size="lg" />
          <WhatsAppButton iconOnly />
        </Row>

        <Row label="product context — name, SKU, price and availability request">
          <WhatsAppButton
            product={{ name: 'Terasaki TemBreak 2 S250-NJ 3P 250A MCCB', sku: 'TER-S250NJ-3P250' }}
          />
          <WhatsAppButton
            label="Ask about 4 pieces"
            product={{
              name: 'Terasaki TemBreak 2 S250-NJ 3P 250A MCCB',
              sku: 'TER-S250NJ-3P250',
              qty: 4,
              unit: 'piece',
            }}
          />
        </Row>

        <Row label="list context — numbered, with quantities and notes">
          <WhatsAppButton
            label="Send my list (3 items)"
            items={[
              {
                productId: '1',
                slug: 'a',
                name: 'Terasaki S250-NJ 250A MCCB',
                sku: 'TER-S250NJ-3P250',
                availability: 'ready_stock',
                qty: 4,
                unit: 'piece',
                note: '3P, 36 kA',
              },
              {
                productId: '2',
                slug: 'b',
                name: 'Schneider EasyPact CVS100F 100A',
                sku: 'SCH-CVS100F-3P100',
                availability: 'ready_stock',
                qty: 6,
                unit: 'piece',
              },
              {
                productId: '3',
                slug: 'c',
                name: 'WAGO 221-413 Lever Connector',
                sku: 'WAG-221413-B50',
                availability: 'available_on_order',
                qty: 5,
                unit: 'box',
              },
            ]}
          />
        </Row>

        <Row label="explicit message override">
          <WhatsAppButton
            label="Ask about bulk rates"
            message="Hi Fast Traders, I am a panel builder in Lahore and buy monthly. Could we discuss trade rates?"
          />
        </Row>
      </Card>

      {/* -------------------------- AvailabilityBadge -------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          AvailabilityBadge
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          What a buyer is told instead of a stock count. Each carries a dot as well as a colour —
          colour alone fails WCAG 1.4.1.
        </p>

        <Row label="all four states, no lead time">
          {AVAILABILITIES.map((value) => (
            <AvailabilityBadge key={value} value={value} />
          ))}
        </Row>

        <Row label="with lead time subtext">
          {AVAILABILITIES.map((value) => (
            <AvailabilityBadge
              key={value}
              value={value}
              {...(LEAD_TIMES[value] ? { leadTime: LEAD_TIMES[value] } : {})}
            />
          ))}
        </Row>

        <Row label="size=sm (grid cards)">
          {AVAILABILITIES.map((value) => (
            <AvailabilityBadge key={value} value={value} size="sm" />
          ))}
        </Row>
      </Card>
      <ContactSectionPart2 sample={sample} />
    </section>
  );
}
