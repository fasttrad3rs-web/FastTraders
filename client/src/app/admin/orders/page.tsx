'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminOrders, type AdminQuery } from '@/lib/api/admin';
import { useDebounce } from '@/hooks/use-debounce';
import { env } from '@/lib/env';
import { cn, formatDate, formatPKR } from '@/lib/utils';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'accent'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'accent',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'muted',
};

export default function AdminOrdersPage(): JSX.Element {
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
  const { data, isPending } = useAdminOrders(query);

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          data
            ? `${data.meta.total} orders · ${formatPKR(data.filteredRevenue ?? 0)} in this view`
            : 'Loading…'
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`${env.NEXT_PUBLIC_API_URL}/admin/orders/export?format=xlsx`}>
              <Download />
              Export
            </a>
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto">
          {TABS.map((tab) => (
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
          placeholder="Search order number, customer, phone or tracking…"
          aria-label="Search orders"
          leadingIcon={<Search />}
          className="h-9 max-w-md"
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No orders in this view"
          description="Try a different status tab, or clear the search."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Placed</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm font-semibold text-brand-navy hover:text-brand-cyan"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-2xs text-muted-foreground">
                      {order.items.length} line{order.items.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{order.customer.name}</span>
                    <span className="block text-2xs text-muted-foreground">{order.customer.phone}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'muted'}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[order.orderStatus] ?? 'muted'}>
                      {order.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPKR(order.total)}
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
