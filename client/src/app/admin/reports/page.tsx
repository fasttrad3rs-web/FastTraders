'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { apiClient, unwrap } from '@/lib/api-client';
import { env } from '@/lib/env';
import { cn, formatPKR } from '@/lib/utils';

type ReportType = 'sales' | 'inventory' | 'customer';

interface ReportResult {
  title: string;
  generatedAt: string;
  summary: Record<string, number | string>;
  rows: Record<string, unknown>[];
}

const TYPES: { value: ReportType; label: string; body: string }[] = [
  { value: 'sales', label: 'Sales', body: 'Order-level revenue, tax, discount and delivery.' },
  { value: 'inventory', label: 'Inventory', body: 'Stock levels, cost price and shelf value.' },
  { value: 'customer', label: 'Customer', body: 'Lifetime value, repeat buyers and last order.' },
];

/** Money-shaped summary keys are formatted as PKR; counts are left as numbers. */
const MONEY_KEYS = new Set(['revenue', 'averageOrderValue', 'totalDiscount', 'totalStockValue', 'totalLifetimeValue', 'averageLifetimeValue']);

export default function AdminReportsPage(): JSX.Element {
  const [type, setType] = useState<ReportType>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'reports', type, from, to],
    queryFn: async () =>
      unwrap(
        await apiClient.get<ReportResult>('/admin/reports', {
          params: { type, format: 'json', ...(from ? { from } : {}), ...(to ? { to } : {}) },
        }),
      ),
  });

  const exportHref = (format: 'csv' | 'xlsx'): string =>
    `${env.NEXT_PUBLIC_API_URL}/admin/reports?type=${type}&format=${format}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;

  const columns = data?.rows[0] ? Object.keys(data.rows[0]) : [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generated live from the database. XLSX exports include a summary sheet."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={exportHref('csv')}>
                <Download />
                CSV
              </a>
            </Button>
            <Button asChild variant="cta" size="sm">
              <a href={exportHref('xlsx')}>
                <FileSpreadsheet />
                XLSX
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setType(option.value)}
            aria-pressed={type === option.value}
            className={cn(
              'rounded-lg border p-4 text-left transition-colors',
              type === option.value
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-border bg-white hover:border-brand-navy/40',
            )}
          >
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              {option.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{option.body}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-white p-4">
        <Field label="From" htmlFor="rep-from">
          <Input id="rep-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9" />
        </Field>
        <Field label="To" htmlFor="rep-to">
          <Input id="rep-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9" />
        </Field>
        <Button variant="primary" size="sm" isLoading={isFetching} onClick={() => void refetch()}>
          <BarChart3 />
          Run report
        </Button>
        {type === 'inventory' ? (
          <p className="text-2xs text-muted-foreground">
            The inventory report is a point-in-time snapshot; the date range does not apply.
          </p>
        ) : null}
      </div>

      {isFetching && !data ? (
        <Skeleton className="h-72 w-full" />
      ) : !data ? (
        <EmptyState title="No data" description="Run the report to see results." />
      ) : (
        <>
          <dl className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(data.summary).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-border bg-white p-4">
                <dt className="text-2xs capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </dt>
                <dd className="font-heading text-lg font-bold tabular-nums text-brand-navy">
                  {typeof value === 'number' && MONEY_KEYS.has(key) ? formatPKR(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>

          {data.rows.length === 0 ? (
            <EmptyState title="No rows in this range" description="Try widening the dates." />
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  {columns.map((column) => (
                    <TableHead key={column} className="whitespace-nowrap capitalize">
                      {column.replace(/([A-Z])/g, ' $1')}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {data.rows.slice(0, 100).map((row, index) => (
                  // eslint-disable-next-line react/no-array-index-key -- report rows have no stable id
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column} className="whitespace-nowrap text-sm">
                        {String(row[column] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data.rows.length > 100 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the first 100 of {data.rows.length} rows. Export for the full set.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
