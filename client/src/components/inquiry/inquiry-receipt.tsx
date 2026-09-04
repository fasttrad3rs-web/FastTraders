'use client';

import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallButton, WhatsAppButton } from '@/components/shared';
import { BUSINESS_HOURS } from '@/lib/constants';

/**
 * The confirmation.
 *
 * It promises a **call**, not a written quotation, because that is what
 * actually happens — Fast Traders quotes on the phone. Promising a document
 * would make the follow-up call feel like a failure and would have somebody
 * sitting waiting for an email that never comes.
 *
 * The reference is prominent so it can be quoted back, and both direct
 * channels stay on screen for anyone who cannot wait until tomorrow.
 */
export function InquiryReceipt({
  inquiryNumber,
  itemCount,
}: {
  inquiryNumber: string;
  itemCount: number;
}): JSX.Element {
  return (
    <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-6 sm:p-8">
      <CheckCircle2 className="size-10 text-success" aria-hidden />

      <h2 className="mt-4 font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
        Got it — we will call you
      </h2>

      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Your inquiry for {itemCount} product{itemCount === 1 ? '' : 's'} is with our team. Someone
        will call to confirm availability, lead time and price.
      </p>

      <div className="mt-5 inline-block rounded-lg border border-border bg-white px-5 py-3">
        <p className="text-2xs uppercase tracking-wide text-muted-foreground">Your reference</p>
        <p className="font-mono text-lg font-bold text-brand-navy">{inquiryNumber}</p>
      </div>

      <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
        <div>
          <p className="font-medium text-foreground">Usually within one working day.</p>
          <ul className="mt-1 space-y-0.5 text-2xs">
            {BUSINESS_HOURS.map((entry) => (
              <li key={entry.days}>
                {entry.days} — {entry.hours}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 border-t border-success/20 pt-5">
        <p className="mb-3 text-xs font-medium text-foreground">Need it sooner? Reach us directly.</p>
        <div className="flex flex-wrap gap-2">
          <CallButton context="inquiry_receipt" label="Call Now" />
          <WhatsAppButton
            message={`Hi Fast Traders, I have just sent inquiry ${inquiryNumber} through the website and wanted to follow up.`}
            label="WhatsApp us"
          />
          <Button asChild variant="outline">
            <Link href="/products">Keep browsing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
