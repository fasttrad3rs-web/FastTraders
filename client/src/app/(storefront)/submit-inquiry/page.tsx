import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/pagination';
import { SubmitInquiryForm } from '@/components/inquiry/submit-inquiry-form';
import { ContactCard } from '@/components/shared';
import { buildMetadata } from '@/lib/seo';

/**
 * Send the shortlist.
 *
 * The last step of the only conversion path on the site: browse, shortlist,
 * ask. Everything upstream gets a buyer ready to ask; this is where they
 * actually do it, and where a lead stops being a page view.
 *
 * Deliberately not indexed — a form with a per-visitor list behind it has
 * nothing for a crawler, and `robots.ts` blocks it too.
 */
export const metadata: Metadata = buildMetadata({
  title: 'Send Your Inquiry — Fast Traders',
  description:
    'Send us your list and we will confirm availability and price, usually within one working day. Lahore-based supplier of industrial and electrical equipment.',
  path: '/submit-inquiry',
  noIndex: true,
});

export default function SubmitInquiryPage(): JSX.Element {
  return (
    <div className="container py-8">
      <Breadcrumb
        items={[{ label: 'Inquiry list', href: '/inquiry-list' }, { label: 'Send inquiry' }]}
        className="mb-4"
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl">
            Send Your Inquiry
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Tell us how to reach you and we will come back with availability, lead time and a price
            for the whole list — usually within one working day.
          </p>

          <SubmitInquiryForm />
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24">
          <p className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Rather just call?
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Most of our business is done on the phone. The counter is open Monday to Saturday.
          </p>
          <ContactCard variant="compact" showMap={false} />
        </aside>
      </div>
    </div>
  );
}
