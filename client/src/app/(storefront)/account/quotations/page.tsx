'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { useMyQuotations } from '@/lib/api/account';
import { formatDate, formatPKR } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'> = {
  new: 'muted',
  reviewing: 'muted',
  quoted: 'accent',
  negotiating: 'warning',
  accepted: 'success',
  rejected: 'danger',
  expired: 'muted',
  converted: 'success',
};

export default function MyQuotationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isPending } = useMyQuotations(page);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        My Quotations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Requests you have sent and the prices we came back with.
      </p>

      {isPending ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No quotations yet"
          description="Add quote-only products to your inquiry list and send us a request."
          icon={<FileText />}
          action={
            <Button asChild variant="cta">
              <Link href="/inquiry">Open my inquiry list</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {data.items.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/account/quotations/${quote.quoteNumber}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand-navy">{quote.quoteNumber}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatDate(quote.createdAt)} · {quote.items.length} line
                      {quote.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[quote.status] ?? 'muted'}>{quote.status}</Badge>
                    <span className="font-heading font-bold tabular-nums text-brand-navy">
                      {typeof quote.quotedTotal === 'number' ? formatPKR(quote.quotedTotal) : '—'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
