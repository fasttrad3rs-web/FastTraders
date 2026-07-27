'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, Calendar, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { QuoteBuilder } from '@/components/admin/quotations/quote-builder';
import { useAdminQuotation } from '@/lib/api/admin-resources';
import { formatDate } from '@/lib/utils';

/** Quote builder page: customer context on the right, pricing on the left. */
export default function AdminQuotationPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { data: quotation, isPending, isError, refetch } = useAdminQuotation(params.id);

  if (isPending) {
    return (
      <>
        <PageHeader title="Quotation" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (isError || !quotation) {
    return <ErrorState title="Quotation not found" onRetry={() => void refetch()} />;
  }

  const expired = quotation.validUntil ? new Date(quotation.validUntil).getTime() < Date.now() : false;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/admin/quotations">
          <ArrowLeft />
          All quotations
        </Link>
      </Button>

      <PageHeader
        title={quotation.quoteNumber}
        description={`Received ${formatDate(quotation.createdAt)} · ${quotation.items.length} line(s)`}
        actions={<Badge variant={quotation.status === 'accepted' ? 'success' : 'accent'}>{quotation.status}</Badge>}
      />

      {expired ? (
        <Alert variant="warning" title="This quotation has expired" className="mb-4">
          Re-price it and set a new validity date before sending again.
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <QuoteBuilder quotation={quotation} />

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Customer
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <p className="font-semibold text-foreground">{quotation.customer.name}</p>
              {quotation.customer.companyName ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
                  {quotation.customer.companyName}
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`tel:${quotation.customer.phone}`} className="hover:text-brand-cyan">
                  {quotation.customer.phone}
                </a>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`mailto:${quotation.customer.email}`} className="truncate hover:text-brand-cyan">
                  {quotation.customer.email}
                </a>
              </p>
              {quotation.requiredBy ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
                  Required by {formatDate(quotation.requiredBy)}
                </p>
              ) : null}
            </dl>
          </section>

          {quotation.message ? (
            <section className="rounded-lg border border-border bg-white p-5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                Their message
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {quotation.message}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
