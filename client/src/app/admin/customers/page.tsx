'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Skeleton, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList } from '@/lib/api/admin-resources';
import { apiClient, unwrap } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, formatPKR } from '@/lib/utils';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  companyName: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  lifetimeValue: number;
}

/** Customer list with a detail drawer showing order history and lifetime value. */
export default function AdminCustomersPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const debounced = useDebounce(search, 300);
  const { data, isPending } = useAdminList<CustomerRow>('users', {
    page,
    limit: 20,
    ...(debounced.length >= 2 ? { search: debounced } : {}),
  });

  const detail = useQuery({
    queryKey: ['admin', 'users', 'detail', openId],
    queryFn: async () => unwrap(await apiClient.get<Record<string, unknown>>(`/admin/users/${openId ?? ''}`)),
    enabled: openId !== null,
  });

  const lifetime = detail.data?.lifetime as
    | { orders: number; value: number; averageOrderValue: number; quotations: number }
    | undefined;
  const orders = (detail.data?.orders ?? []) as { orderNumber: string; total: number; orderStatus: string; createdAt: string }[];

  return (
    <>
      <PageHeader title="Customers" description={data ? `${data.meta.total} accounts` : 'Loading…'} />

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search name, email, phone or company…"
        aria-label="Search customers"
        leadingIcon={<Search />}
        className="mb-4 h-9 max-w-md"
      />

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No customers found" description="Accounts appear here as people register." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Company</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Lifetime value</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.items.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setOpenId(customer.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>{initialsOf(customer.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-brand-navy">{customer.name}</span>
                        <span className="block truncate text-2xs text-muted-foreground">{customer.email}</span>
                      </span>
                      {customer.role !== 'customer' ? <Badge variant="accent">{customer.role}</Badge> : null}
                      {!customer.isActive ? <Badge variant="muted">Disabled</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{customer.companyName ?? '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                  <TableCell className="text-center text-sm">{customer.orderCount}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPKR(customer.lifetimeValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.totalPages > 1 ? (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
          ) : null}
        </>
      )}

      <Dialog open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent side="right" className="w-[min(32rem,94vw)]">
          <div className="border-b border-border p-5">
            <DialogTitle>Customer detail</DialogTitle>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {detail.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Orders', value: String(lifetime?.orders ?? 0) },
                    { label: 'Lifetime value', value: formatPKR(lifetime?.value ?? 0) },
                    { label: 'Average order', value: formatPKR(lifetime?.averageOrderValue ?? 0) },
                    { label: 'Quotations', value: String(lifetime?.quotations ?? 0) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border p-3">
                      <dt className="text-2xs text-muted-foreground">{stat.label}</dt>
                      <dd className="font-heading text-lg font-bold text-brand-navy">{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <h3 className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                    Order history
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders yet.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {orders.slice(0, 12).map((order) => (
                        <li key={order.orderNumber} className="flex items-center justify-between gap-2 p-3">
                          <div>
                            <Link
                              href={`/admin/orders/${order.orderNumber}`}
                              className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                            >
                              {order.orderNumber}
                            </Link>
                            <p className="text-2xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="muted">{order.orderStatus}</Badge>
                            <span className="text-xs font-semibold tabular-nums">{formatPKR(order.total)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Dialog>
    </>
  );
}
