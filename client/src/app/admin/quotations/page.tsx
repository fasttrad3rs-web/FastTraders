'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList } from '@/lib/api/admin-resources';
import { useDebounce } from '@/hooks/use-debounce';
import type { AdminQuery } from '@/lib/api/admin';
import type { QuotationResponse } from '@/lib/api/cart.types';
import { cn, formatDate, formatPKR } from '@/lib/utils';

/** Quotation pipeline. The tabs are the sales funnel, left to right. */
const PIPELINE = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'converted', label: 'Converted' },
  { value: 'rejected', label: 'Rejected' },
] as const;

const VARIANT: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'> = {
  new: 'accent',
  reviewing: 'muted',
  quoted: 'default',
  negotiating: 'warning',
  accepted: 'success',
  converted: 'success',
  rejected: 'danger',
  expired: 'muted',
};

export default function AdminQuotationsPage(): JSX.Element {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debounced = useDebounce(search, 300);
  const query: AdminQuery = {
    page,
    limit: 20,
    sort: 'newest',
    ...(status !== 'all' ? { status } : {}),
    ...(debounced.length >= 2 ? { search: debounced } : {}),
  };
  const { data, isPending } = useAdminList<QuotationResponse>('quotations', query);

  return (
    <>
      <PageHeader
        title="Quotations"
        description={data ? `${data.meta.total} requests in this view` : 'Loading…'}
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto">
          {PIPELINE.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              aria-pressed={status === tab.value}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                status === tab.value
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-border bg-white text-brand-navy hover:border-brand-navy',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search quote number, customer, company or email…"
          aria-label="Search quotations"
          leadingIcon={<Search />}
          className="h-9 max-w-md"
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nothing in this stage"
          description="New requests land in the New tab as customers submit them."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Quote</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Received</TableHead>
                <TableHead className="text-center">Lines</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Quoted</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.items.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <Link
                      href={`/admin/quotations/${quote.id}`}
                      className="font-mono text-sm font-semibold text-brand-navy hover:text-brand-cyan"
                    >
                      {quote.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{quote.customer.name}</span>
                    <span className="block text-2xs text-muted-foreground">
                      {quote.customer.companyName ?? quote.customer.phone}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </TableCell>
                  <TableCell className="text-center text-sm">{quote.items.length}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={VARIANT[quote.status] ?? 'muted'}>{quote.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {typeof quote.quotedTotal === 'number' ? formatPKR(quote.quotedTotal) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.totalPages > 1 ? (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          ) : null}
        </>
      )}
    </>
  );
}
