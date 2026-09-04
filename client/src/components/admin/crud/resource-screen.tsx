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
    /*
     * Creating and editing need opposite treatment of a blank field.
     *
     * On CREATE, dropping blanks is right: the server's `.default()` values
     * then apply, and an omitted optional field is simply absent.
     *
     * On EDIT it was wrong, and quietly so. Blanks were dropped from the patch
     * too, which meant clearing a banner's subtitle, a brand's country or a
     * testimonial's role sent a PATCH that never mentioned the field — the old
     * value stayed, the toast still said "updated", and the text reappeared on
     * the next load. There was no way to remove an optional value at all.
     *
     * `null` is the server's "unset this" signal; the update schemas mark every
     * clearable field `.nullable()`.
     */
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);

    // Only optional fields become `null`. Blanking a required one should reach
    // the server as an empty string and fail validation with a message about
    // that field, rather than as a null the schema rejects more obscurely.
    const optional = new Set(fields.filter((field) => !field.required).map((field) => field.name));

    const payload = editing
      ? Object.fromEntries(
          entries.map(([key, value]) => [key, value === '' && optional.has(key) ? null : value]),
        )
      : Object.fromEntries(entries.filter(([, value]) => value !== ''));

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
