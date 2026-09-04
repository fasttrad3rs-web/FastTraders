'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Copy, Download, EyeOff, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react';
import { ProductDeleteDialogs } from './delete-dialogs';
import { Badge } from '@/components/ui/badge';
import { AvailabilityBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useProductMutations } from '@/lib/api/admin';
import { imageProps } from '@/lib/images';
import { cn, formatPKR } from '@/lib/utils';
import type { AdminProduct } from '@/lib/api/admin';

/** Admin product table: selection, inline status toggle, row actions. */



function stockTone(product: AdminProduct): string {
  if (product.stock <= 0) return 'text-destructive';
  if (product.stock <= product.lowStockThreshold) return 'text-warning';
  return 'text-foreground';
}

export function ProductTable({
  products,
  isLoading,
  selected,
  onSelectedChange,
}: {
  products: AdminProduct[];
  isLoading: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
}): JSX.Element {
  const mutations = useProductMutations();
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [pendingPurge, setPendingPurge] = useState<AdminProduct | null>(null);

  const allSelected = products.length > 0 && selected.length === products.length;

  const toggleAll = (): void =>
    onSelectedChange(allSelected ? [] : products.map((product) => product.id));

  const toggleOne = (id: string): void =>
    onSelectedChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  const toggleActive = (product: AdminProduct): void => {
    mutations.update.mutate(
      { id: product.id, patch: { isActive: !product.isActive } },
      {
        onSuccess: () =>
          toast.success(product.isActive ? 'Product deactivated' : 'Product activated', {
            description: product.name,
          }),
        onError: (error) => toast.error('Could not update', { description: error.message }),
      },
    );
  };

  if (isLoading) return <TableSkeleton rows={8} />;

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products match those filters"
        description="Try clearing a filter, or add your first product."
        action={
          <Button asChild variant="cta" size="sm">
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <tr>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all products on this page"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="hidden md:table-cell">Brand</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="text-center">Sourcing</TableHead>
            <TableHead className="text-right">Last quoted</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="w-10" />
          </tr>
        </TableHeader>

        <TableBody>
          {products.map((product) => {
            const brand = typeof product.brand === 'string' ? null : product.brand;
            const category = typeof product.category === 'string' ? null : product.category;

            return (
              <TableRow key={product.id} className={cn(!product.isActive && 'opacity-60')}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(product.id)}
                    onCheckedChange={() => toggleOne(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-white">
                      <Image
                        {...imageProps(product.images[0]?.url)}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-contain"
                      />
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="line-clamp-1 text-sm font-medium text-brand-navy hover:text-brand-cyan"
                      >
                        {product.name}
                      </Link>
                      <span className="block font-mono text-2xs text-muted-foreground">{product.sku}</span>
                    </span>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell text-sm">{brand?.name ?? '—'}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{category?.name ?? '—'}</TableCell>

                <TableCell className="text-center">
                  <Badge variant={product.isImportItem ? 'accent' : 'muted'}>
                    {product.isImportItem ? 'To order' : 'Stocked'}
                  </Badge>
                </TableCell>

                {/* Internal only — never rendered on the storefront. */}
                <TableCell className="text-right text-sm tabular-nums">
                  {typeof product.lastQuotedPrice === 'number' ? formatPKR(product.lastQuotedPrice) : '—'}
                </TableCell>

                <TableCell className="text-center">
                  <span className={cn('text-sm font-semibold tabular-nums', stockTone(product))}>
                    {product.stock}
                  </span>
                  <span className="mt-0.5 block">
                    <AvailabilityBadge value={product.availability} size="sm" />
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={() => toggleActive(product)}
                    aria-label={`${product.isActive ? 'Deactivate' : 'Activate'} ${product.name}`}
                  />
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${product.name}`}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-navy/5 hover:text-brand-navy"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Pencil />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.slug}`} target="_blank">
                          <Upload />
                          View on site
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(product.sku);
                          toast.success('SKU copied');
                        }}
                      >
                        <Copy />
                        Copy SKU
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setPendingDelete(product)}
                        className="text-destructive focus:text-destructive"
                      >
                        <EyeOff />
                        Hide from storefront
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setPendingPurge(product)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 />
                        Delete permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ProductDeleteDialogs
        deactivating={pendingDelete}
        purging={pendingPurge}
        onClose={() => {
          setPendingDelete(null);
          setPendingPurge(null);
        }}
      />
    </>
  );
}

export { Download };
