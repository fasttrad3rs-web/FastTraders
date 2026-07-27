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
