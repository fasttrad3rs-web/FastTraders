'use client';

import Link from 'next/link';
import { MapPin, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/feedback';

/**
 * The two lists that tell Sharjeel something he cannot get from a status count.
 *
 * `byCity` answers "where is the demand?" — useful when deciding whether a
 * Faisalabad customer is worth a delivery run.
 *
 * `topRequestedNotStocked` is the more valuable one: every row is something a
 * real buyer asked for that the catalogue does not carry. That is a stocking
 * decision backed by evidence rather than a hunch, and it is the whole reason
 * the sourcing form is worth having.
 */

function Bars({
  rows,
  empty,
}: {
  rows: { name: string; inquiries: number }[];
  empty: string;
}): JSX.Element {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>;
  }

  // Scaled against the largest row, so the shape is readable at any volume.
  const max = Math.max(...rows.map((row) => row.inquiries), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-medium text-foreground" title={row.name}>
              {row.name}
            </span>
            <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
              {row.inquiries}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand-cyan"
              style={{ width: `${Math.round((row.inquiries / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PipelinePanels({
  byCity,
  topRequestedNotStocked,
  loading,
}: {
  byCity: { name: string; inquiries: number }[];
  topRequestedNotStocked: { name: string; inquiries: number }[];
  loading: boolean;
}): JSX.Element {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          <MapPin className="size-4 text-brand-cyan" aria-hidden />
          Inquiries by city
        </h2>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Bars rows={byCity} empty="No cities recorded yet." />
        )}
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="mb-1 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          <PackageSearch className="size-4 text-brand-cyan" aria-hidden />
          Asked for but not stocked
        </h2>
        <p className="mb-4 text-2xs text-muted-foreground">
          From China sourcing requests. Worth considering for the catalogue.
        </p>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Bars
            rows={topRequestedNotStocked}
            empty="No China sourcing requests yet."
          />
        )}

        <Link
          href="/admin/inquiries?type=sourcing_request"
          className="mt-4 inline-block text-2xs font-semibold text-brand-cyan hover:underline"
        >
          See all China sourcing requests →
        </Link>
      </section>
    </div>
  );
}
