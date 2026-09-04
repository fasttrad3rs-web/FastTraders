'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { AvailabilityBadge } from '@/components/shared';
import type { InquiryItem } from '@/store/inquiry-store';

/**
 * What is about to be sent, shown above the form.
 *
 * Not decoration: somebody who shortlisted eight breakers over two visits
 * needs to see the list before they commit, and a mistake caught here saves a
 * phone call. The edit link goes back rather than making the list editable in
 * two places.
 */
export function InquirySummary({ items }: { items: InquiryItem[] }): JSX.Element {
  const units = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <section className="rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          You are asking about {items.length} product{items.length === 1 ? '' : 's'}
        </h2>
        <Link
          href="/inquiry-list"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-cyan hover:underline"
        >
          <Pencil className="size-3" aria-hidden />
          Edit list
        </Link>
      </div>

      <ul className="divide-y divide-brand-cyan/20">
        {items.map((item) => (
          <li key={item.productId} className="flex flex-wrap items-start gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="font-mono text-2xs text-muted-foreground">
                {item.sku}
                {item.brand ? ` · ${item.brand}` : ''}
              </p>
              {item.note ? (
                <p className="mt-1 text-2xs italic text-muted-foreground">“{item.note}”</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <AvailabilityBadge value={item.availability} size="sm" />
              <span className="text-sm font-semibold tabular-nums">
                {item.qty} {item.unit}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-brand-cyan/20 pt-3 text-2xs text-muted-foreground">
        {units} unit{units === 1 ? '' : 's'} in total. No prices are shown because we quote against
        quantity and the day&rsquo;s stock — that is what this inquiry is for.
      </p>
    </section>
  );
}
