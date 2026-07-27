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
