'use client';

import { useMemo, useState } from 'react';
import { FileDown, Save, Send, ShoppingBag } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/admin/primitives';
import { useQuotationActions } from '@/lib/api/admin-resources';
import { env } from '@/lib/env';
import { formatPKR } from '@/lib/utils';
import type { QuotationResponse } from '@/lib/api/cart.types';

/**
 * Quote builder — the heart of the RFQ side of the business.
 *
 * Line totals recalculate as the admin types, but the figures that get saved
 * are recomputed server-side from the unit prices. The admin sees a preview,
 * not the source of truth, so a stale browser tab can never persist a wrong
 * total.
 */
export function QuoteBuilder({ quotation }: { quotation: QuotationResponse }): JSX.Element {
  const actions = useQuotationActions(quotation.id);

  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      quotation.items.map((item) => [item.sku, item.quotedUnitPrice ? String(item.quotedUnitPrice) : '']),
    ),
  );
  const [taxRate, setTaxRate] = useState('18');
  const [validUntil, setValidUntil] = useState(
    quotation.validUntil ? quotation.validUntil.slice(0, 10) : defaultValidity(),
  );
  const [terms, setTerms] = useState('');
  const [converting, setConverting] = useState(false);

  const totals = useMemo(() => {
    const subtotal = quotation.items.reduce((sum, item) => {
      const unit = Number(prices[item.sku] ?? '');
      return sum + (Number.isFinite(unit) ? unit * item.qty : 0);
    }, 0);
    const rate = Number(taxRate);
    const tax = Number.isFinite(rate) ? Math.round((subtotal * rate) / 100) : 0;
    return { subtotal, tax, total: subtotal + tax };
  }, [prices, quotation.items, taxRate]);

  const pricedCount = quotation.items.filter((item) => Number(prices[item.sku] ?? '') > 0).length;
  const fullyPriced = pricedCount === quotation.items.length;
  const alreadyConverted = quotation.status === 'converted';

  const savePricing = async (status?: string): Promise<void> => {
    const items = quotation.items
      .filter((item) => Number(prices[item.sku] ?? '') > 0)
      .map((item) => ({ sku: item.sku, quotedUnitPrice: Number(prices[item.sku]) }));

    if (items.length === 0) {
      toast.error('Price at least one line before saving');
      return;
    }

    try {
      await actions.price.mutateAsync({
        items,
        quotedTax: totals.tax,
        ...(validUntil ? { validUntil } : {}),
        ...(terms ? { adminNotes: terms } : {}),
        ...(status ? { status } : {}),
      });
      toast.success('Quotation saved', {
        description: fullyPriced ? 'Every line is priced — ready to send.' : `${items.length} of ${quotation.items.length} lines priced.`,
      });
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-white">
        <Table className="rounded-none border-0">
          <TableHeader>
            <tr>
              <TableHead>Item</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="w-40 text-right">Unit price (Rs.)</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {quotation.items.map((item) => {
              const unit = Number(prices[item.sku] ?? '');
              const lineTotal = Number.isFinite(unit) ? unit * item.qty : 0;

              return (
                <TableRow key={item.sku}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="font-mono text-2xs text-muted-foreground">{item.sku}</p>
                    {item.customerNote ? (
                      <p className="mt-1 text-2xs italic text-brand-cyan">
                        Customer: &ldquo;{item.customerNote}&rdquo;
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {item.qty} {item.unit}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={prices[item.sku] ?? ''}
                      onChange={(event) =>
                        setPrices((current) => ({ ...current, [item.sku]: event.target.value }))
                      }
                      aria-label={`Unit price for ${item.sku}`}
                      className="h-9 text-right font-mono"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {lineTotal > 0 ? formatPKR(lineTotal) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <dl className="space-y-1.5 border-t border-border bg-surface p-4 text-sm">
          <Row label="Subtotal" value={formatPKR(totals.subtotal)} />
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              Sales tax
              <Input
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(event) => setTaxRate(event.target.value)}
                aria-label="Tax rate percentage"
                className="h-7 w-16 text-right text-xs"
              />
              %
            </dt>
            <dd className="tabular-nums">{formatPKR(totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="font-heading font-bold text-brand-navy">Quoted total</dt>
            <dd className="font-heading text-lg font-bold tabular-nums text-brand-navy">
              {formatPKR(totals.total)}
            </dd>
          </div>
          <p className="pt-1 text-2xs text-muted-foreground">
            Preview only — the server recalculates these from the unit prices when you save.
          </p>
        </dl>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-white p-5 sm:grid-cols-2">
        <Field label="Valid until" htmlFor="qb-valid" hint="Prices move with the exchange rate.">
          <Input
            id="qb-valid"
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </Field>
        <Field label="Lines priced" htmlFor="qb-progress">
          <p id="qb-progress" className="pt-2 text-sm">
            <span className="font-heading text-xl font-bold text-brand-navy">{pricedCount}</span>
            <span className="text-muted-foreground"> of {quotation.items.length}</span>
          </p>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Terms & internal notes" htmlFor="qb-terms" hint="The first line appears on the PDF.">
            <Textarea
              id="qb-terms"
              rows={3}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              placeholder="Lead time 6–8 weeks from order confirmation. Ex-works Lahore."
            />
          </Field>
        </div>
      </div>

      {!fullyPriced ? (
        <Alert variant="warning" className="text-xs">
          {quotation.items.length - pricedCount} line(s) still have no price. You can save progress,
          but the quotation cannot be sent until every line is priced.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" isLoading={actions.price.isPending} onClick={() => void savePricing()}>
          <Save />
          Save progress
        </Button>

        <Button
          variant="cta"
          disabled={!fullyPriced}
          isLoading={actions.send.isPending}
          onClick={async () => {
            await savePricing('quoted');
            try {
              const result = await actions.send.mutateAsync();
              toast.success(`Quotation emailed to ${result.sentTo}`);
            } catch (error) {
              toast.error('Could not send', { description: error instanceof Error ? error.message : undefined });
            }
          }}
        >
          <Send />
          Save &amp; send to customer
        </Button>

        <Button asChild variant="ghost">
          <a
            href={`${env.NEXT_PUBLIC_API_URL}/admin/quotations/${quotation.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown />
            Preview PDF
          </a>
        </Button>

        <Button
          variant="primary"
          className="ml-auto"
          disabled={quotation.status !== 'accepted' || alreadyConverted}
          onClick={() => setConverting(true)}
        >
          <ShoppingBag />
          {alreadyConverted ? 'Already converted' : 'Convert to order'}
        </Button>
      </div>

      {quotation.status !== 'accepted' && !alreadyConverted ? (
        <p className="text-2xs text-muted-foreground">
          Conversion unlocks once the customer accepts. Current status:{' '}
          <strong className="text-brand-navy">{quotation.status}</strong>.
        </p>
      ) : null}

      <ConfirmDialog
        open={converting}
        onOpenChange={setConverting}
        title="Create an order from this quotation?"
        description="The order uses the quoted prices, not current catalogue prices — the customer accepted these figures. A confirmation email is sent automatically."
        confirmLabel="Create order"
        isLoading={actions.convert.isPending}
        onConfirm={() => {
          actions.convert.mutate(
            { paymentMethod: 'bank_transfer' },
            {
              onSuccess: (result) =>
                toast.success(`Order ${result.order.orderNumber} created`, {
                  description: 'The customer has been emailed a confirmation.',
                }),
              onError: (error) => toast.error('Could not convert', { description: error.message }),
            },
          );
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Default validity window: 15 days, matching the terms on the PDF. */
function defaultValidity(): string {
  return new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);
}
