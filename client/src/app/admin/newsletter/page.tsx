'use client';

import { useState } from 'react';
import { Download, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList } from '@/lib/api/admin-resources';
import { env } from '@/lib/env';
import { formatDate } from '@/lib/utils';

interface SubscriberRow {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
}

export default function AdminNewsletterPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isPending } = useAdminList<SubscriberRow>('newsletter', { page, limit: 50 });

  return (
    <>
      <PageHeader
        title="Newsletter"
        description={data ? `${data.meta.total} subscriber(s)` : 'Loading…'}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`${env.NEXT_PUBLIC_API_URL}/admin/newsletter/export?format=csv`}>
              <Download />
              Export CSV
            </a>
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No subscribers yet"
          description="The signup form in the footer feeds this list."
          icon={<Mail />}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.items.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="text-sm">{subscriber.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(subscriber.subscribedAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={subscriber.isActive ? 'success' : 'muted'}>
                      {subscriber.isActive ? 'Subscribed' : 'Unsubscribed'}
                    </Badge>
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
    </>
  );
}
