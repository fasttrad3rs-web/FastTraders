'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, MessageSquare, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/input';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useQuotation } from '@/lib/api/account';
import { useRespondToQuotation } from '@/lib/api/mutations';
import { formatDate, formatPKR } from '@/lib/utils';

/** Quotation detail with the customer-side accept / reject / counter actions. */
export default function QuotationDetailPage(): JSX.Element {
  const params = useParams<{ quoteNumber: string }>();
  const { data: quote, isPending, isError, refetch } = useQuotation(params.quoteNumber);
  const respond = useRespondToQuotation();
  const [message, setMessage] = useState('');

  const canRespond = quote ? ['quoted', 'negotiating'].includes(quote.status) : false;
  const expired = quote?.validUntil ? new Date(quote.validUntil).getTime() < Date.now() : false;

  const act = async (action: 'accept' | 'reject' | 'counter'): Promise<void> => {
    if (!quote) return;
    if (action === 'counter' && message.trim().length === 0) {
      toast.error('Tell us what you would like changed');
      return;
    }

    try {
      await respond.mutateAsync({ id: quote.id, action, ...(message ? { message } : {}) });
      setMessage('');
      await refetch();
      toast.success(
        action === 'accept' ? 'Quotation accepted' : action === 'reject' ? 'Quotation rejected' : 'Counter-offer sent',
      );
    } catch (error) {
      toast.error('Could not send your response', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/account/quotations">
          <ArrowLeft />
          All quotations
        </Link>
      </Button>

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !quote ? (
        <ErrorState title="Quotation not found" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
                {quote.quoteNumber}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Sent {formatDate(quote.createdAt)}
                {quote.validUntil ? ` · valid until ${formatDate(quote.validUntil)}` : ''}
              </p>
            </div>
            <Badge variant={quote.status === 'accepted' ? 'success' : 'accent'}>{quote.status}</Badge>
          </div>

          {expired && canRespond ? (
            <Alert variant="warning" title="This quotation has expired">
              Prices move with the exchange rate. Send a fresh request and we will requote.
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase">Item</th>
                  <th className="px-4 py-2.5 text-center text-2xs font-semibold uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase">Unit</th>
                  <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item) => (
                  <tr key={item.sku}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="font-mono text-2xs text-muted-foreground">{item.sku}</p>
                      {item.customerNote ? (
                        <p className="mt-1 text-2xs italic text-muted-foreground">“{item.customerNote}”</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.qty} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {typeof item.quotedUnitPrice === 'number' ? formatPKR(item.quotedUnitPrice) : 'Pending'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {typeof item.quotedTotal === 'number' ? formatPKR(item.quotedTotal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {typeof quote.quotedTotal === 'number' ? (
              <dl className="space-y-1.5 border-t border-border bg-surface px-4 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatPKR(quote.quotedSubtotal ?? 0)}</dd>
                </div>
                {quote.quotedTax ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sales tax</dt>
                    <dd className="tabular-nums">{formatPKR(quote.quotedTax)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-2">
                  <dt className="font-heading font-bold text-brand-navy">Quoted total</dt>
                  <dd className="font-heading text-lg font-bold tabular-nums text-brand-navy">
                    {formatPKR(quote.quotedTotal)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="border-t border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
                Our team is still pricing this request.
              </p>
            )}
          </div>

          {canRespond && !expired ? (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                Your response
              </h2>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional for accept or reject; required if you want to counter."
                aria-label="Message to Fast Traders"
                className="mt-3"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="cta" isLoading={respond.isPending} onClick={() => void act('accept')}>
                  <Check />
                  Accept quotation
                </Button>
                <Button variant="outline" onClick={() => void act('counter')} disabled={respond.isPending}>
                  <MessageSquare />
                  Send counter-offer
                </Button>
                <Button variant="ghost" onClick={() => void act('reject')} disabled={respond.isPending}>
                  <X />
                  Decline
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
