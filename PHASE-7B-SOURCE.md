# Fast Traders — Phase 7B source dump

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

Quote builder plus the remaining twelve admin screens.
Total files: 17

---

## `client/src/lib/api/admin-resources.ts`

```ts
'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { AdminList, AdminQuery } from './admin';
import type { QuotationResponse, OrderResponse } from './cart.types';
import type { Setting } from '@/types';

/**
 * Hooks for the remaining Phase 4 admin endpoints.
 *
 * Split from `admin.ts` to keep both files readable; the query-key namespace
 * is shared so a mutation in one can invalidate the other.
 */

export const resourceKeys = {
  list: (resource: string, params: unknown) => ['admin', resource, params] as const,
  item: (resource: string, id: string) => ['admin', resource, 'item', id] as const,
};

/** Generic list hook — every admin collection returns the same envelope. */
export function useAdminList<T>(resource: string, params: AdminQuery = {}): UseQueryResult<AdminList<T>> {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<T>>(`/admin/${resource}`, { params })),
    placeholderData: keepPreviousData,
  });
}

/** Taxonomy endpoints return a bare array rather than a paginated envelope. */
export function useAdminCollection<T>(resource: string, params: AdminQuery = {}): UseQueryResult<T[]> {
  return useQuery({
    queryKey: resourceKeys.list(resource, params),
    queryFn: async () => unwrap(await apiClient.get<T[]>(`/admin/${resource}`, { params })),
    placeholderData: keepPreviousData,
  });
}

export interface CrudApi<T> {
  create: UseMutationResult<T, Error, Record<string, unknown>>;
  update: UseMutationResult<T, Error, { id: string; patch: Record<string, unknown> }>;
  remove: UseMutationResult<null, Error, string>;
  reorder: UseMutationResult<null, Error, { id: string; displayOrder: number }[]>;
}

export function useCrud<T>(resource: string): CrudApi<T> {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', resource] });
  };

  return {
    create: useMutation({
      mutationFn: async (body) => unwrap(await apiClient.post<T>(`/admin/${resource}`, body)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }) => unwrap(await apiClient.patch<T>(`/admin/${resource}/${id}`, patch)),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id) => {
        await apiClient.delete(`/admin/${resource}/${id}`);
        return null;
      },
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: async (items) => {
        await apiClient.patch(`/admin/${resource}/reorder`, { items });
        return null;
      },
      onSuccess: invalidate,
    }),
  };
}

/* ------------------------------- Quotations ------------------------------ */

export function useAdminQuotation(id: string): UseQueryResult<QuotationResponse> {
  return useQuery({
    queryKey: resourceKeys.item('quotations', id),
    queryFn: async () => unwrap(await apiClient.get<QuotationResponse>(`/admin/quotations/${id}`)),
    enabled: id.length > 0,
  });
}

export interface QuotationApi {
  price: UseMutationResult<QuotationResponse, Error, Record<string, unknown>>;
  send: UseMutationResult<{ sentTo: string }, Error, void>;
  convert: UseMutationResult<{ order: OrderResponse }, Error, Record<string, unknown>>;
  assign: UseMutationResult<QuotationResponse, Error, string | null>;
}

export function useQuotationActions(id: string): QuotationApi {
  const queryClient = useQueryClient();
  const seed = (data: QuotationResponse): void => {
    queryClient.setQueryData(resourceKeys.item('quotations', id), data);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] });
  };

  return {
    price: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<QuotationResponse>(`/admin/quotations/${id}`, body)),
      onSuccess: seed,
    }),
    send: useMutation({
      mutationFn: async () =>
        unwrap(await apiClient.post<{ sentTo: string }>(`/admin/quotations/${id}/send`)),
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] }),
    }),
    convert: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.post<{ order: OrderResponse }>(`/admin/quotations/${id}/convert`, body)),
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'quotations'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      },
    }),
    assign: useMutation({
      mutationFn: async (assignedTo) =>
        unwrap(await apiClient.patch<QuotationResponse>(`/admin/quotations/${id}/assign`, { assignedTo })),
      onSuccess: seed,
    }),
  };
}

/* -------------------------------- Settings ------------------------------- */

export function useAdminSettings(): UseQueryResult<Setting> {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => unwrap(await apiClient.get<Setting>('/admin/settings')),
  });
}

export function useUpdateSettings(): UseMutationResult<Setting, Error, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => unwrap(await apiClient.patch<Setting>('/admin/settings', body)),
    onSuccess: (data) => queryClient.setQueryData(['admin', 'settings'], data),
  });
}

/* -------------------------------- Reviews -------------------------------- */

export function useReviewModeration(): {
  approve: UseMutationResult<unknown, Error, { id: string; isApproved: boolean }>;
  remove: UseMutationResult<unknown, Error, string>;
} {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  };

  return {
    approve: useMutation({
      mutationFn: async ({ id, isApproved }) =>
        unwrap(await apiClient.patch(`/admin/reviews/${id}/approval`, { isApproved })),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete(`/admin/reviews/${id}`)),
      onSuccess: invalidate,
    }),
  };
}

/* -------------------------------- Contacts ------------------------------- */

export function useContactStatus(): UseMutationResult<unknown, Error, { id: string; status: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => unwrap(await apiClient.patch(`/admin/contacts/${id}`, { status })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'contacts'] }),
  });
}
```

## `client/src/components/admin/quotations/quote-builder.tsx`

```tsx
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
```

## `client/src/components/admin/crud/resource-screen.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { useAdminCollection, useCrud } from '@/lib/api/admin-resources';

/**
 * Generic CRUD screen.
 *
 * Categories, brands, banners and coupons expose the same shape on the API, so
 * they share one implementation: list on the left, edit in a right-hand drawer.
 * Anything genuinely bespoke (the category tree, the banner preview) is passed
 * in as `renderRow` or `extra`.
 */

export type FieldKind = 'text' | 'textarea' | 'number' | 'url' | 'date' | 'boolean' | 'select';

export interface ResourceField {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ResourceRecord {
  id: string;
  [key: string]: unknown;
}

export function ResourceScreen<T extends ResourceRecord>({
  resource,
  title,
  description,
  fields,
  columns,
  renderRow,
  emptyTitle,
  extra,
}: {
  resource: string;
  title: string;
  description?: string;
  fields: ResourceField[];
  columns: { key: string; label: string }[];
  renderRow?: (record: T) => React.ReactNode;
  emptyTitle: string;
  extra?: (record: T | null) => React.ReactNode;
}): JSX.Element {
  const { data, isPending } = useAdminCollection<T>(resource);
  const crud = useCrud<T>(resource);

  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const openCreate = (): void => {
    setValues(Object.fromEntries(fields.map((field) => [field.name, field.kind === 'boolean' ? true : ''])));
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (record: T): void => {
    setValues(Object.fromEntries(fields.map((field) => [field.name, record[field.name] ?? ''])));
    setEditing(record);
    setCreating(true);
  };

  const save = async (): Promise<void> => {
    // Drop blanks so the server's defaults and optional fields still apply.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== '' && value !== undefined),
    );

    try {
      if (editing) await crud.update.mutateAsync({ id: editing.id, patch: payload });
      else await crud.create.mutateAsync(payload);

      toast.success(editing ? `${title} updated` : `${title} created`);
      setCreating(false);
      setEditing(null);
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description ?? (data ? `${data.length} record(s)` : 'Loading…')}
        actions={
          <Button variant="cta" size="sm" onClick={openCreate}>
            <Plus />
            Add
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          action={
            <Button variant="cta" size="sm" onClick={openCreate}>
              <Plus />
              Add the first one
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {data.map((record) => (
            <li
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                {renderRow ? (
                  renderRow(record)
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {columns.map((column) => (
                      <span key={column.key} className="text-sm">
                        <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                          {column.label}:{' '}
                        </span>
                        <span className="font-medium text-foreground">
                          {String(record[column.key] ?? '—')}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                  <Pencil />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDelete(record)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className="w-[min(30rem,92vw)]">
          <div className="border-b border-border p-5">
            <DialogTitle>{editing ? `Edit ${title.toLowerCase()}` : `New ${title.toLowerCase()}`}</DialogTitle>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {fields.map((field) => (
              <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.hint} required={field.required}>
                {field.kind === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    rows={3}
                    value={String(values[field.name] ?? '')}
                    onChange={(event) => setValues((c) => ({ ...c, [field.name]: event.target.value }))}
                  />
                ) : field.kind === 'boolean' ? (
                  <div className="flex items-center gap-2.5 pt-1">
                    <Checkbox
                      id={field.name}
                      checked={values[field.name] === true}
                      onCheckedChange={(checked) => setValues((c) => ({ ...c, [field.name]: checked === true }))}
                    />
                    <Label htmlFor={field.name} className="font-normal">
                      {field.hint ?? 'Enabled'}
                    </Label>
                  </div>
                ) : field.kind === 'select' ? (
                  <Select
                    value={String(values[field.name] ?? '')}
                    onValueChange={(value) => setValues((c) => ({ ...c, [field.name]: value }))}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
                    placeholder={field.placeholder}
                    value={String(values[field.name] ?? '')}
                    onChange={(event) =>
                      setValues((c) => ({
                        ...c,
                        [field.name]: field.kind === 'number' ? Number(event.target.value) : event.target.value,
                      }))
                    }
                  />
                )}
              </Field>
            ))}

            {extra ? extra(editing) : null}
          </div>

          <div className="flex gap-2 border-t border-border p-5">
            <Button
              variant="cta"
              block
              isLoading={crud.create.isPending || crud.update.isPending}
              onClick={() => void save()}
            >
              {editing ? 'Save changes' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete this ${title.toLowerCase()}?`}
        description="This cannot be undone. If the record is still referenced by products, the API will refuse and tell you how many."
        confirmLabel="Delete"
        destructive
        isLoading={crud.remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          crud.remove.mutate(pendingDelete.id, {
            onSuccess: () => toast.success(`${title} deleted`),
            onError: (error) => toast.error('Could not delete', { description: error.message }),
          });
          setPendingDelete(null);
        }}
      />
    </>
  );
}
```

## `client/src/components/admin/crud/category-form.tsx`

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CategoryOption {
  id: string;
  name: string;
  level: number;
}

/** Create/edit drawer for a category. */
export function CategoryFormDrawer({
  open,
  onOpenChange,
  editingId,
  values,
  setValues,
  options,
  isSaving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  values: Record<string, unknown>;
  setValues: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  options: CategoryOption[];
  isSaving: boolean;
  onSave: () => void;
}): JSX.Element {
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(28rem,92vw)]">
          <div className="border-b border-border p-5">
            <DialogTitle>{editingId ? 'Edit category' : 'New category'}</DialogTitle>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <Field label="Name" htmlFor="cat-name" required>
              <Input
                id="cat-name"
                value={String(values.name ?? '')}
                onChange={(event) => setValues((c) => ({ ...c, name: event.target.value }))}
              />
            </Field>
            <Field label="Slug" htmlFor="cat-slug" hint="Leave blank to generate from the name.">
              <Input
                id="cat-slug"
                className="font-mono text-xs"
                value={String(values.slug ?? '')}
                onChange={(event) => setValues((c) => ({ ...c, slug: event.target.value }))}
              />
            </Field>
            <Field label="Parent" htmlFor="cat-parent" hint="Leave as root for a top-level category.">
              <Select
                value={String(values.parent ?? 'root')}
                onValueChange={(value) => setValues((c) => ({ ...c, parent: value === 'root' ? '' : value }))}
              >
                <SelectTrigger id="cat-parent"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">— Root category —</SelectItem>
                  {options
                    .filter((item) => item.level < 2 && item.id !== editingId)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {'— '.repeat(item.level)}{item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" htmlFor="cat-desc">
              <Textarea
                id="cat-desc"
                rows={3}
                value={String(values.description ?? '')}
                onChange={(event) => setValues((c) => ({ ...c, description: event.target.value }))}
              />
            </Field>
            <Field label="Icon" htmlFor="cat-icon" hint="Lucide icon name, e.g. ShieldCheck.">
              <Input
                id="cat-icon"
                value={String(values.icon ?? '')}
                onChange={(event) => setValues((c) => ({ ...c, icon: event.target.value }))}
              />
            </Field>
            <Field label="Display order" htmlFor="cat-order">
              <Input
                id="cat-order"
                type="number"
                value={String(values.displayOrder ?? 0)}
                onChange={(event) => setValues((c) => ({ ...c, displayOrder: Number(event.target.value) }))}
              />
            </Field>

            {(['isFeatured', 'isActive'] as const).map((key) => (
              <div key={key} className="flex items-center gap-2.5">
                <Checkbox
                  id={`cat-${key}`}
                  checked={values[key] === true}
                  onCheckedChange={(checked) => setValues((c) => ({ ...c, [key]: checked === true }))}
                />
                <Label htmlFor={`cat-${key}`} className="font-normal">
                  {key === 'isFeatured' ? 'Featured in the mega-menu' : 'Active on the storefront'}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-t border-border p-5">
            <Button variant="cta" block isLoading={isSaving} onClick={onSave}>
              {editingId ? 'Save changes' : 'Create category'}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </SheetContent>
      </Dialog>
  );
}
```

## `client/src/app/admin/quotations/page.tsx`

```tsx
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
```

## `client/src/app/admin/quotations/[id]/page.tsx`

```tsx
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
```

## `client/src/app/admin/categories/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { CategoryFormDrawer } from '@/components/admin/crud/category-form';
import { useAdminCollection, useCrud } from '@/lib/api/admin-resources';
import { cn } from '@/lib/utils';

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  level: number;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  description?: string;
  icon?: string;
  [key: string]: unknown;
}

/**
 * Category tree.
 *
 * The API returns a flat list sorted by level and display order; the tree is
 * assembled here. Reordering is drag-to-swap within a parent, posted as one
 * bulk `reorder` call rather than a write per row.
 */
export default function AdminCategoriesPage(): JSX.Element {
  const { data, isPending } = useAdminCollection<CategoryRecord>('categories');
  const crud = useCrud<CategoryRecord>('categories');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [pendingDelete, setPendingDelete] = useState<CategoryRecord | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const all = data ?? [];
  const childrenOf = (parent: string | null): CategoryRecord[] =>
    all.filter((item) => (item.parent ?? null) === parent).sort((a, b) => a.displayOrder - b.displayOrder);

  const openForm = (record: CategoryRecord | null, parent?: string | null): void => {
    setEditing(record);
    setValues(
      record
        ? { ...record }
        : { name: '', slug: '', parent: parent ?? '', displayOrder: 0, isActive: true, isFeatured: false },
    );
    setOpen(true);
  };

  const save = async (): Promise<void> => {
    const payload = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => value !== '' && !['id', 'level'].includes(key)),
    );
    // An empty parent means a root category, which the API expects as null.
    if (!values.parent) payload.parent = null;

    try {
      if (editing) await crud.update.mutateAsync({ id: editing.id, patch: payload });
      else await crud.create.mutateAsync(payload);
      toast.success(editing ? 'Category updated' : 'Category created');
      setOpen(false);
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  };

  /** Swap two siblings and post both new positions in one call. */
  const swap = (source: CategoryRecord, target: CategoryRecord): void => {
    if ((source.parent ?? null) !== (target.parent ?? null)) {
      toast.error('Categories can only be reordered within the same parent');
      return;
    }
    crud.reorder.mutate(
      [
        { id: source.id, displayOrder: target.displayOrder },
        { id: target.id, displayOrder: source.displayOrder },
      ],
      {
        onSuccess: () => toast.success('Order updated'),
        onError: (error) => toast.error('Could not reorder', { description: error.message }),
      },
    );
  };

  const renderNode = (node: CategoryRecord): JSX.Element => {
    const children = childrenOf(node.id);
    const isOpen = expanded.has(node.id);

    return (
      <li key={node.id}>
        <div
          draggable
          onDragStart={() => setDragId(node.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            const source = all.find((item) => item.id === dragId);
            if (source && source.id !== node.id) swap(source, node);
            setDragId(null);
          }}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border bg-white p-3',
            node.level > 0 && 'ml-6',
            !node.isActive && 'opacity-60',
          )}
        >
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />

          {children.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
              aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
              aria-expanded={isOpen}
              className="rounded p-0.5 text-muted-foreground hover:text-brand-navy"
            >
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-brand-navy">{node.name}</span>
            <span className="block font-mono text-2xs text-muted-foreground">{node.slug}</span>
          </span>

          {node.isFeatured ? <Badge variant="accent">Featured</Badge> : null}
          {!node.isActive ? <Badge variant="muted">Inactive</Badge> : null}

          <div className="flex shrink-0 gap-0.5">
            {node.level < 2 ? (
              <Button variant="ghost" size="sm" onClick={() => openForm(null, node.id)} aria-label={`Add child of ${node.name}`}>
                <Plus />
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => openForm(node)} aria-label={`Edit ${node.name}`}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setPendingDelete(node)}
              aria-label={`Delete ${node.name}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        {isOpen && children.length > 0 ? (
          <ul className="mt-2 space-y-2">{children.map(renderNode)}</ul>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Up to three levels — drag within a parent to reorder."
        actions={
          <Button variant="cta" size="sm" onClick={() => openForm(null, null)}>
            <Plus />
            Add root category
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : all.length === 0 ? (
        <EmptyState title="No categories yet" description="Start with a root category such as Switchgear & Protection." />
      ) : (
        <ul className="space-y-2">{childrenOf(null).map(renderNode)}</ul>
      )}

      <CategoryFormDrawer
        open={open}
        onOpenChange={setOpen}
        editingId={editing?.id ?? null}
        values={values}
        setValues={setValues}
        options={all}
        isSaving={crud.create.isPending || crud.update.isPending}
        onSave={() => void save()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Delete this category?"
        description="The API refuses if it still has sub-categories or products, and tells you how many. Reassign those first."
        confirmLabel="Delete"
        destructive
        isLoading={crud.remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          crud.remove.mutate(pendingDelete.id, {
            onSuccess: () => toast.success('Category deleted'),
            onError: (error) => toast.error('Could not delete', { description: error.message }),
          });
          setPendingDelete(null);
        }}
      />
    </>
  );
}
```

## `client/src/app/admin/brands/page.tsx`

```tsx
'use client';

import { ResourceScreen } from '@/components/admin/crud/resource-screen';

interface BrandRecord {
  id: string;
  name: string;
  slug: string;
  country?: string;
  logo?: string;
  displayOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

export default function AdminBrandsPage(): JSX.Element {
  return (
    <ResourceScreen<BrandRecord>
      resource="brands"
      title="Brands"
      fields={[
        { name: 'name', label: 'Name', kind: 'text', required: true },
        { name: 'slug', label: 'Slug', kind: 'text', hint: 'Leave blank to generate from the name.' },
        { name: 'country', label: 'Country of origin', kind: 'text', placeholder: 'Japan' },
        { name: 'logo', label: 'Logo URL', kind: 'url', hint: 'Upload to Cloudinary and paste the URL.' },
        { name: 'website', label: 'Manufacturer website', kind: 'url' },
        { name: 'description', label: 'Description', kind: 'textarea' },
        { name: 'displayOrder', label: 'Display order', kind: 'number' },
        { name: 'isFeatured', label: 'Featured', kind: 'boolean', hint: 'Show in the homepage mega-menu' },
        { name: 'isActive', label: 'Active', kind: 'boolean', hint: 'Visible on the storefront' },
      ]}
      columns={[]}
      emptyTitle="No brands yet"
      renderRow={(brand) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface text-[10px] font-bold uppercase text-brand-navy">
            {brand.logo ? (
              // Brand logos are remote Cloudinary assets of unknown ratio.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="" className="max-h-8 max-w-14 object-contain" />
            ) : (
              brand.name.slice(0, 8)
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-navy">{brand.name}</span>
            <span className="block text-2xs text-muted-foreground">
              {brand.country ?? '—'} · order {brand.displayOrder}
              {brand.isActive ? '' : ' · inactive'}
            </span>
          </span>
        </div>
      )}
    />
  );
}
```

## `client/src/app/admin/banners/page.tsx`

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { ResourceScreen } from '@/components/admin/crud/resource-screen';

interface BannerRecord {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  ctaText?: string;
  position: 'hero' | 'strip' | 'sidebar';
  displayOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

/** Banner CRUD. Each row renders a live preview of how it appears on the site. */
export default function AdminBannersPage(): JSX.Element {
  return (
    <ResourceScreen<BannerRecord>
      resource="banners"
      title="Banners"
      description="Homepage hero slides and promotional strips."
      fields={[
        { name: 'title', label: 'Headline', kind: 'text', required: true },
        { name: 'subtitle', label: 'Subtitle', kind: 'textarea' },
        { name: 'image', label: 'Image URL', kind: 'url', required: true, hint: '1920×720 for hero, 1920×300 for strip.' },
        { name: 'mobileImage', label: 'Mobile image URL', kind: 'url', hint: 'Portrait crop, 828×1000.' },
        { name: 'link', label: 'Link', kind: 'text', placeholder: '/products' },
        { name: 'ctaText', label: 'Button text', kind: 'text', placeholder: 'Browse Catalog' },
        {
          name: 'position',
          label: 'Position',
          kind: 'select',
          required: true,
          options: [
            { value: 'hero', label: 'Hero slider' },
            { value: 'strip', label: 'Promotional strip' },
            { value: 'sidebar', label: 'Sidebar' },
          ],
        },
        { name: 'displayOrder', label: 'Display order', kind: 'number' },
        { name: 'startsAt', label: 'Starts', kind: 'date', hint: 'Optional scheduling.' },
        { name: 'endsAt', label: 'Ends', kind: 'date' },
        { name: 'isActive', label: 'Active', kind: 'boolean' },
      ]}
      columns={[]}
      emptyTitle="No banners yet"
      renderRow={(banner) => (
        <div className="flex items-center gap-4">
          <span className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-border bg-brand-dark">
            {/* Remote promotional artwork of arbitrary dimensions. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.image} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-[8px] font-bold uppercase leading-tight text-white">
              {banner.title.slice(0, 40)}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-navy">{banner.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{banner.position}</Badge>
              <span className="text-2xs text-muted-foreground">order {banner.displayOrder}</span>
              {banner.isActive ? null : <Badge variant="muted">Inactive</Badge>}
            </span>
          </span>
        </div>
      )}
    />
  );
}
```

## `client/src/app/admin/coupons/page.tsx`

```tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { ResourceScreen } from '@/components/admin/crud/resource-screen';
import { formatDate, formatPKR } from '@/lib/utils';

interface CouponRecord {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  [key: string]: unknown;
}

/** Coupon CRUD with live usage stats on each row. */
export default function AdminCouponsPage(): JSX.Element {
  return (
    <ResourceScreen<CouponRecord>
      resource="coupons"
      title="Coupons"
      description="Discount codes applied at checkout. The server re-validates every code when an order is placed."
      fields={[
        { name: 'code', label: 'Code', kind: 'text', required: true, placeholder: 'TRADE5' },
        {
          name: 'type',
          label: 'Type',
          kind: 'select',
          required: true,
          options: [
            { value: 'percent', label: 'Percentage off' },
            { value: 'fixed', label: 'Fixed amount off (Rs.)' },
          ],
        },
        { name: 'value', label: 'Value', kind: 'number', required: true, hint: 'Percent (max 100) or rupees.' },
        { name: 'minOrder', label: 'Minimum order (Rs.)', kind: 'number' },
        { name: 'maxDiscount', label: 'Maximum discount (Rs.)', kind: 'number', hint: 'Caps percentage coupons.' },
        { name: 'usageLimit', label: 'Usage limit', kind: 'number', hint: 'Leave blank for unlimited.' },
        { name: 'validFrom', label: 'Valid from', kind: 'date' },
        { name: 'validTo', label: 'Valid to', kind: 'date', required: true },
        { name: 'isActive', label: 'Active', kind: 'boolean' },
      ]}
      columns={[]}
      emptyTitle="No coupons yet"
      renderRow={(coupon) => {
        const expired = new Date(coupon.validTo).getTime() < Date.now();
        const exhausted = coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit;

        return (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="rounded bg-brand-navy px-2 py-1 font-mono text-xs font-bold text-white">
              {coupon.code}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {coupon.type === 'percent' ? `${coupon.value}% off` : `${formatPKR(coupon.value)} off`}
              {coupon.maxDiscount ? ` (max ${formatPKR(coupon.maxDiscount)})` : ''}
            </span>
            <span className="text-2xs text-muted-foreground">
              Min order {formatPKR(coupon.minOrder)} · used {coupon.usedCount}
              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} · expires {formatDate(coupon.validTo)}
            </span>
            {!coupon.isActive ? <Badge variant="muted">Disabled</Badge> : null}
            {expired ? <Badge variant="danger">Expired</Badge> : null}
            {exhausted ? <Badge variant="warning">Limit reached</Badge> : null}
            {coupon.isActive && !expired && !exhausted ? <Badge variant="success">Live</Badge> : null}
          </div>
        );
      }}
    />
  );
}
```

## `client/src/app/admin/customers/page.tsx`

```tsx
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
```

## `client/src/app/admin/reviews/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Check, Star, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Rating } from '@/components/ui/commerce';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { useAdminList, useReviewModeration } from '@/lib/api/admin-resources';
import { cn, formatDate } from '@/lib/utils';

interface ReviewRow {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user?: { name?: string } | string;
  product?: { name?: string; slug?: string } | string;
}

const named = (value: ReviewRow['user'] | ReviewRow['product']): string =>
  value && typeof value !== 'string' && 'name' in value ? (value.name ?? '') : '';

/** Moderation queue. Pending reviews first — that is the job on this screen. */
export default function AdminReviewsPage(): JSX.Element {
  const [pendingOnly, setPendingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ReviewRow | null>(null);

  const { data, isPending } = useAdminList<ReviewRow>('reviews', {
    page,
    limit: 20,
    includePending: true,
    sort: 'newest',
  });
  const moderation = useReviewModeration();

  const rows = (data?.items ?? []).filter((review) => (pendingOnly ? !review.isApproved : true));

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approved reviews appear on the product page and count towards its rating."
        actions={
          <Button variant={pendingOnly ? 'primary' : 'outline'} size="sm" onClick={() => setPendingOnly((v) => !v)}>
            {pendingOnly ? 'Showing pending only' : 'Showing all'}
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={pendingOnly ? 'Nothing waiting for moderation' : 'No reviews yet'}
          description={pendingOnly ? 'All caught up.' : 'Reviews appear here once customers leave them.'}
          icon={<Star />}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((review) => (
            <li
              key={review.id}
              className={cn(
                'rounded-lg border bg-white p-4',
                review.isApproved ? 'border-border' : 'border-warning/50',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={review.rating} size="sm" />
                    {review.isVerifiedPurchase ? <Badge variant="success">Verified purchase</Badge> : null}
                    <Badge variant={review.isApproved ? 'success' : 'warning'}>
                      {review.isApproved ? 'Published' : 'Pending'}
                    </Badge>
                  </div>

                  {review.title ? (
                    <p className="mt-2 text-sm font-semibold text-brand-navy">{review.title}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                  <p className="mt-2 text-2xs text-muted-foreground">
                    {named(review.user) || 'Customer'} on {named(review.product) || 'a product'} ·{' '}
                    {formatDate(review.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {!review.isApproved ? (
                    <Button
                      variant="cta"
                      size="sm"
                      isLoading={moderation.approve.isPending}
                      onClick={() =>
                        moderation.approve.mutate(
                          { id: review.id, isApproved: true },
                          {
                            onSuccess: () => toast.success('Review published'),
                            onError: (error) => toast.error('Could not publish', { description: error.message }),
                          },
                        )
                      }
                    >
                      <Check />
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        moderation.approve.mutate(
                          { id: review.id, isApproved: false },
                          { onSuccess: () => toast.success('Review unpublished') },
                        )
                      }
                    >
                      <X />
                      Unpublish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setToDelete(review)}
                    aria-label="Delete review"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this review?"
        description="It is removed permanently and the product's rating is recalculated."
        confirmLabel="Delete"
        destructive
        isLoading={moderation.remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          moderation.remove.mutate(toDelete.id, { onSuccess: () => toast.success('Review deleted') });
          setToDelete(null);
        }}
      />
    </>
  );
}
```

## `client/src/app/admin/contacts/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Mail, MailOpen, Phone, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList, useContactStatus } from '@/lib/api/admin-resources';
import { cn, formatDate } from '@/lib/utils';

interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
  status: 'new' | 'read' | 'responded';
  createdAt: string;
}

const TABS = ['new', 'read', 'responded', 'all'] as const;

/** Inbox-style enquiry list. Expanding a message marks it read. */
export default function AdminContactsPage(): JSX.Element {
  const [tab, setTab] = useState<(typeof TABS)[number]>('new');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isPending } = useAdminList<ContactRow>('contacts', {
    page,
    limit: 20,
    ...(tab !== 'all' ? { status: tab } : {}),
  });
  const setStatus = useContactStatus();

  const expand = (contact: ContactRow): void => {
    const next = openId === contact.id ? null : contact.id;
    setOpenId(next);
    if (next && contact.status === 'new') {
      setStatus.mutate({ id: contact.id, status: 'read' });
    }
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={data ? `${data.meta.total} message(s) in this view` : 'Loading…'}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
            aria-pressed={tab === value}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              tab === value
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-white text-brand-navy hover:border-brand-navy',
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nothing here" description="Messages from the contact form land in New." icon={<Mail />} />
      ) : (
        <ul className="space-y-2">
          {data.items.map((contact) => {
            const open = openId === contact.id;

            return (
              <li
                key={contact.id}
                className={cn(
                  'rounded-lg border bg-white transition-colors',
                  contact.status === 'new' ? 'border-brand-cyan/50' : 'border-border',
                )}
              >
                <button
                  type="button"
                  onClick={() => expand(contact)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {contact.status === 'new' ? (
                    <Mail className="size-4 shrink-0 text-brand-cyan" aria-hidden />
                  ) : (
                    <MailOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-sm',
                          contact.status === 'new' ? 'font-bold text-brand-navy' : 'font-medium text-foreground',
                        )}
                      >
                        {contact.subject}
                      </span>
                      <Badge variant={contact.status === 'responded' ? 'success' : 'muted'}>
                        {contact.status}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
                      {contact.name} · {contact.email} · {formatDate(contact.createdAt)}
                    </span>
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-border p-4">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{contact.message}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild variant="cta" size="sm">
                        <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`}>
                          <Reply />
                          Reply by email
                        </a>
                      </Button>
                      {contact.phone ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={`tel:${contact.phone}`}>
                            <Phone />
                            {contact.phone}
                          </a>
                        </Button>
                      ) : null}
                      {contact.status !== 'responded' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate(
                              { id: contact.id, status: 'responded' },
                              { onSuccess: () => toast.success('Marked as responded') },
                            )
                          }
                        >
                          Mark responded
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}
    </>
  );
}
```

## `client/src/app/admin/newsletter/page.tsx`

```tsx
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
```

## `client/src/app/admin/audit-logs/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList } from '@/lib/api/admin-resources';
import { formatDate } from '@/lib/utils';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string;
  at: string;
  actor?: { name?: string; email?: string } | string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  create: 'success',
  update: 'default',
  delete: 'danger',
  status_change: 'warning',
  login: 'muted',
  logout: 'muted',
};

const ENTITIES = ['all', 'Product', 'Order', 'Quotation', 'User', 'Category', 'Brand', 'Setting', 'Review'];

/** Append-only activity feed. Entries expire after two years via a TTL index. */
export default function AdminAuditLogsPage(): JSX.Element {
  const [entity, setEntity] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isPending } = useAdminList<AuditRow>('audit-logs', {
    page,
    limit: 30,
    ...(entity !== 'all' ? { entity } : {}),
  });

  const actorName = (actor: AuditRow['actor']): string => {
    if (!actor) return 'System';
    if (typeof actor === 'string') return 'Staff member';
    return actor.name ?? actor.email ?? 'Staff member';
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin mutation, with the actor and IP. Sensitive fields are redacted from snapshots."
        actions={
          <Select value={entity} onValueChange={(value) => { setEntity(value); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by entity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === 'all' ? 'All entities' : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isPending ? (
        <TableSkeleton rows={10} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No activity recorded" description="Admin actions appear here as they happen." icon={<ScrollText />} />
      ) : (
        <>
          <ol className="space-y-2">
            {data.items.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ACTION_VARIANT[entry.action] ?? 'muted'}>
                    {entry.action.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm font-medium text-brand-navy">{entry.entity}</span>
                  <span className="font-mono text-2xs text-muted-foreground">{entry.entityId}</span>
                  <span className="ml-auto text-2xs text-muted-foreground">{formatDate(entry.at)}</span>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  {actorName(entry.actor)}
                  {entry.ip ? ` · ${entry.ip}` : ''}
                </p>

                {entry.after && Object.keys(entry.after).length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-2xs font-medium text-brand-cyan">
                      View change
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-surface p-3 font-mono text-[10px] leading-relaxed text-foreground">
                      {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>

          {data.meta.totalPages > 1 ? (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
          ) : null}
        </>
      )}
    </>
  );
}
```

## `client/src/app/admin/reports/page.tsx`

```tsx
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
```

## `client/src/app/admin/settings/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminSettings, useUpdateSettings } from '@/lib/api/admin-resources';
import type { ShippingRule } from '@/types';

/**
 * Store settings.
 *
 * Prefilled with Fast Traders' real details by the seeder; this screen is how
 * Sharjeel changes them without a developer. Shipping rules drive the delivery
 * charge the checkout applies, so the order matters: the first city match wins,
 * with `*` as the fallback.
 */
export default function AdminSettingsPage(): JSX.Element {
  const { data: settings, isPending } = useAdminSettings();
  const update = useUpdateSettings();

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [rules, setRules] = useState<ShippingRule[]>([]);

  useEffect(() => {
    if (!settings) return;
    setForm({
      storeName: settings.storeName,
      tagline: settings.tagline,
      email: settings.email,
      phone: settings.phone,
      landline: settings.landline ?? '',
      whatsapp: settings.whatsapp ?? '',
      address: settings.address,
      defaultTaxRate: settings.defaultTaxRate,
      announcementText: settings.announcement?.text ?? '',
      announcementLink: settings.announcement?.link ?? '',
      announcementActive: settings.announcement?.isActive ?? false,
      facebook: settings.social?.facebook ?? '',
      instagram: settings.social?.instagram ?? '',
      linkedin: settings.social?.linkedin ?? '',
      bankName: settings.bankDetails?.bankName ?? '',
      accountTitle: settings.bankDetails?.accountTitle ?? '',
      accountNumber: settings.bankDetails?.accountNumber ?? '',
      iban: settings.bankDetails?.iban ?? '',
    });
    setRules(settings.shippingRules ?? []);
  }, [settings]);

  const set = (key: string, value: unknown): void => setForm((current) => ({ ...current, [key]: value }));
  const text = (key: string): string => String(form[key] ?? '');

  const save = async (): Promise<void> => {
    try {
      await update.mutateAsync({
        storeName: text('storeName'),
        tagline: text('tagline'),
        email: text('email'),
        phone: text('phone'),
        ...(text('landline') ? { landline: text('landline') } : {}),
        ...(text('whatsapp') ? { whatsapp: text('whatsapp') } : {}),
        address: text('address'),
        defaultTaxRate: Number(form.defaultTaxRate ?? 18),
        social: {
          ...(text('facebook') ? { facebook: text('facebook') } : {}),
          ...(text('instagram') ? { instagram: text('instagram') } : {}),
          ...(text('linkedin') ? { linkedin: text('linkedin') } : {}),
        },
        shippingRules: rules,
        announcement: {
          ...(text('announcementText') ? { text: text('announcementText') } : {}),
          ...(text('announcementLink') ? { link: text('announcementLink') } : {}),
          isActive: form.announcementActive === true,
        },
        ...(text('bankName') && text('accountNumber')
          ? {
              bankDetails: {
                bankName: text('bankName'),
                accountTitle: text('accountTitle'),
                accountNumber: text('accountNumber'),
                ...(text('iban') ? { iban: text('iban') } : {}),
              },
            }
          : {}),
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  };

  if (isPending) {
    return (
      <>
        <PageHeader title="Settings" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store details, delivery charges and the announcement bar."
        actions={
          <Button variant="cta" size="sm" isLoading={update.isPending} onClick={() => void save()}>
            <Save />
            Save all
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-white p-5">
        <Tabs defaultValue="store">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="shipping">Shipping &amp; tax</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="announcement">Announcement</TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name" htmlFor="st-name" required>
                <Input id="st-name" value={text('storeName')} onChange={(e) => set('storeName', e.target.value)} />
              </Field>
              <Field label="Tagline" htmlFor="st-tagline">
                <Input id="st-tagline" value={text('tagline')} onChange={(e) => set('tagline', e.target.value)} />
              </Field>
              <Field label="Email" htmlFor="st-email" required>
                <Input id="st-email" type="email" value={text('email')} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Mobile / WhatsApp" htmlFor="st-phone" required>
                <Input id="st-phone" value={text('phone')} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Landline" htmlFor="st-landline">
                <Input id="st-landline" value={text('landline')} onChange={(e) => set('landline', e.target.value)} />
              </Field>
              <Field label="WhatsApp digits" htmlFor="st-wa" hint="No + or spaces, e.g. 923244234990.">
                <Input id="st-wa" value={text('whatsapp')} onChange={(e) => set('whatsapp', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" htmlFor="st-address" required>
                  <Textarea id="st-address" rows={2} value={text('address')} onChange={(e) => set('address', e.target.value)} />
                </Field>
              </div>
              {(['facebook', 'instagram', 'linkedin'] as const).map((key) => (
                <Field key={key} label={key} htmlFor={`st-${key}`} className="capitalize">
                  <Input id={`st-${key}`} type="url" value={text(key)} onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shipping">
            <Field label="Default sales tax (%)" htmlFor="st-tax" hint="Applied to orders unless a product overrides it.">
              <Input
                id="st-tax"
                type="number"
                min={0}
                max={100}
                className="max-w-[140px]"
                value={String(form.defaultTaxRate ?? 18)}
                onChange={(e) => set('defaultTaxRate', Number(e.target.value))}
              />
            </Field>

            <p className="mb-2 mt-6 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Delivery zones
            </p>
            <Alert variant="info" className="mb-3 text-xs">
              Matched top to bottom — the first city match wins, and <code className="font-mono">*</code>{' '}
              is the fallback for everywhere else. Keep the wildcard last.
            </Alert>

            <ul className="space-y-2">
              {rules.map((rule, index) => (
                // eslint-disable-next-line react/no-array-index-key -- rules are positional
                <li key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5">
                  {([
                    ['label', 'Label', 'text'],
                    ['city', 'City or *', 'text'],
                    ['cost', 'Cost (Rs.)', 'number'],
                    ['freeAbove', 'Free above (Rs.)', 'number'],
                    ['etaDays', 'ETA', 'text'],
                  ] as const).map(([key, label, kind]) => (
                    <Input
                      key={key}
                      type={kind}
                      placeholder={label}
                      aria-label={`${label} for zone ${index + 1}`}
                      value={String(rule[key] ?? '')}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item, position) =>
                            position === index
                              ? { ...item, [key]: kind === 'number' ? Number(event.target.value) : event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  ))}
                  <div className="sm:col-span-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setRules((current) => current.filter((_, position) => position !== index))}
                    >
                      <Trash2 />
                      Remove zone
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setRules((current) => [...current, { label: '', city: '', cost: 0, etaDays: '' }])
              }
            >
              <Plus />
              Add zone
            </Button>
          </TabsContent>

          <TabsContent value="payments">
            <Alert variant="info" className="mb-4 text-xs">
              COD, bank transfer and card are enabled. JazzCash and Easypaisa are wired as adapters
              on the server but not contracted, so the checkout shows them disabled.
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['bankName', 'Bank name'],
                ['accountTitle', 'Account title'],
                ['accountNumber', 'Account number'],
                ['iban', 'IBAN'],
              ] as const).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`st-${key}`}>
                  <Input id={`st-${key}`} value={text(key)} onChange={(e) => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
            <p className="mt-3 text-2xs text-muted-foreground">
              These appear at checkout when a customer picks bank transfer, and on the PDF invoice.
            </p>
          </TabsContent>

          <TabsContent value="announcement">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="st-ann"
                  checked={form.announcementActive === true}
                  onCheckedChange={(checked) => set('announcementActive', checked === true)}
                />
                <Label htmlFor="st-ann" className="font-normal">
                  Show the announcement bar at the top of every page
                </Label>
              </div>
              <Field label="Message" htmlFor="st-ann-text">
                <Input id="st-ann-text" maxLength={200} value={text('announcementText')} onChange={(e) => set('announcementText', e.target.value)} />
              </Field>
              <Field label="Link" htmlFor="st-ann-link" hint="Optional — where the bar links to.">
                <Input id="st-ann-link" value={text('announcementLink')} onChange={(e) => set('announcementLink', e.target.value)} />
              </Field>

              {form.announcementActive === true && text('announcementText') ? (
                <div className="rounded-lg border border-border">
                  <p className="border-b border-border bg-surface px-3 py-1.5 text-2xs font-bold uppercase text-muted-foreground">
                    Preview
                  </p>
                  <div className="bg-brand-cyan px-4 py-2 text-center text-xs font-medium text-white">
                    {text('announcementText')}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
```
