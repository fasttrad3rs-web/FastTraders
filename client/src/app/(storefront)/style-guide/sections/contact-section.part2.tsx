'use client';

import { Card } from '@/components/ui/card';
import {
  AddToInquiryButton,
  ContactCard,
  PriceOnRequest,
} from '@/components/shared';
import type { InquirableProduct } from '@/components/shared';
import { Row } from './row';

/** Continues `contact-section.tsx`; split only for the 300-line ceiling. */
export function ContactSectionPart2({
  sample,
}: {
  sample: (availability: InquirableProduct['availability']) => InquirableProduct;
}): JSX.Element {
  return (
    <>
      {/* -------------------------- AddToInquiryButton ------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          AddToInquiryButton
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Nothing is reserved and nothing is priced — this is a shortlist, not a basket. Press one twice and it flips
          to <strong>In your list ✓</strong> and links to the list rather than vanishing.
        </p>

        <Row label="default · outline · cta · block">
          <AddToInquiryButton product={sample('ready_stock')} />
          <AddToInquiryButton product={{ ...sample('ready_stock'), id: 'demo-2' }} variant="outline" />
          <AddToInquiryButton product={{ ...sample('ready_stock'), id: 'demo-3' }} variant="cta" />
        </Row>

        <Row label="with quantity and a note carried onto the inquiry">
          <AddToInquiryButton
            product={{ ...sample('ready_stock'), id: 'demo-4' }}
            qty={12}
            note="Needed by the 20th, 3P only"
            label="Add 12 to Inquiry"
          />
        </Row>
      </Card>

      {/* --------------------------- PriceOnRequest ---------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          PriceOnRequest
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          The most important block on the site — it stands exactly where a price would. An empty
          slot reads as a broken page, so it is filled with the reason and three ways to get an
          answer.
        </p>

        <div className="grid gap-5 lg:grid-cols-3">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="rounded-lg border border-border bg-surface p-4">
              <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
                size={size}
              </p>
              <PriceOnRequest product={{ ...sample('ready_stock'), id: `pod-${size}` }} size={size} />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
              import_on_request — lead time shown
            </p>
            <PriceOnRequest product={{ ...sample('import_on_request'), id: 'pod-import' }} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
              discontinued — no shortlist button, call and WhatsApp remain
            </p>
            <PriceOnRequest product={{ ...sample('discontinued'), id: 'pod-disc' }} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
            actions=false — for a grid card where the whole tile is a link
          </p>
          <PriceOnRequest
            product={{ ...sample('available_on_order'), id: 'pod-noactions' }}
            size="sm"
            actions={false}
          />
        </div>
      </Card>

      {/* ------------------------------ ContactCard ---------------------- */}
      <Card className="mb-6 p-5">
        <h3 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          ContactCard
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          One component for the footer, /contact and the homepage — three hand-maintained copies
          would drift the moment a number changes.
        </p>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
              default
            </p>
            <ContactCard />
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
              compact, no hours, no actions
            </p>
            <ContactCard variant="compact" showHours={false} actions={false} />
          </div>

          <div className="rounded-lg border border-border bg-brand-dark p-4">
            <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">
              dark (footer)
            </p>
            <ContactCard variant="dark" actions={false} />
          </div>
        </div>
      </Card>
    </>
  );
}
