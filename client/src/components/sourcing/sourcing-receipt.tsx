'use client';

import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallButton, WhatsAppButton } from '@/components/shared';
import { BUSINESS_HOURS } from '@/lib/constants';

/**
 * Sourcing confirmation.
 *
 * Deliberately vaguer about timing than the inquiry receipt. A stocked part
 * gets a call the same day; an imported one needs a supplier checked first,
 * sometimes across a time zone. Promising "within business hours" here would
 * be a promise the shop cannot keep, and a missed promise costs more than an
 * honest "one to two working days".
 */
export function SourcingReceiptCard({
  inquiryNumber,
  attachmentsAccepted = 0,
  attachmentsRejected = [],
}: {
  inquiryNumber: string;
  attachmentsAccepted?: number;
  attachmentsRejected?: { name: string; reason: string }[];
}): JSX.Element {
  return (
    <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-6 sm:p-8">
      <CheckCircle2 className="size-10 text-success" aria-hidden />

      <h2 className="mt-4 font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
        Request received — we are on it
      </h2>

      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        We will check what we can source, from where, and how long it takes, then call you back.
        Usually one to two working days for an imported item — sooner if we can get it locally.
      </p>

      {attachmentsAccepted > 0 ? (
        <p className="mt-3 text-sm text-success-foreground">
          {attachmentsAccepted} attachment{attachmentsAccepted === 1 ? '' : 's'} received.
        </p>
      ) : null}

      {/*
        Said plainly rather than swallowed. A customer who thinks the nameplate
        photo arrived will not resend it, and the request then stalls on a
        detail nobody has.
      */}
      {attachmentsRejected.length > 0 ? (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-brand-navy">
            We could not read {attachmentsRejected.length} of your file
            {attachmentsRejected.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            {attachmentsRejected.map((file) => (
              <li key={file.name}>
                {file.name} — {file.reason}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Send them on WhatsApp instead and quote {inquiryNumber}.
          </p>
        </div>
      ) : null}

      <div className="mt-5 inline-block rounded-lg border border-border bg-white px-5 py-3">
        <p className="text-2xs uppercase tracking-[0.15em] text-muted-foreground">
          Your reference
        </p>
        <p className="font-mono text-lg font-bold text-brand-navy">{inquiryNumber}</p>
      </div>

      <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
        <dl className="space-y-0.5">
          {BUSINESS_HOURS.map((row) => (
            <div key={row.days} className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-foreground">{row.days}</dt>
              <dd>{row.hours}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <CallButton context="sourcing_receipt" />
        <WhatsAppButton
          message={`Hi Fast Traders, I've just sent sourcing request ${inquiryNumber}.`}
        />
        <Button asChild variant="outline">
          <Link href="/products">Keep browsing</Link>
        </Button>
      </div>
    </div>
  );
}
