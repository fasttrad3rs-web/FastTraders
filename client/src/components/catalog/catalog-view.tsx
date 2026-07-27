'use client';

import { useState } from 'react';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState, ProductCardSkeleton } from '@/components/ui/feedback';
import { ProductCard } from '@/components/product/product-card';
import { useProducts } from '@/lib/api/queries';
import type { CategoryNode, ProductFacets, ProductListResponse } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { FilterSidebar } from './filter-sidebar';
import { useCatalogFilters, type LayoutMode } from './use-catalog-filters';

/**
 * Interactive catalogue.
 *
 * The server renders the first page (good for SEO and first paint) and passes
 * it as `initialData`; every subsequent filter change is a client query keyed
 * on the URL, so the grid updates without a full navigation.
 */
export function CatalogView({
  initialData,
  categories,
  heading,
  lockedCategory,
}: {
  initialData: ProductListResponse | null;
  categories: CategoryNode[];
  heading: string;
  /** Set on category pages so the category cannot be filtered away. */
  lockedCategory?: string;
}): JSX.Element {
  const api = useCatalogFilters();
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = { ...api.filters, ...(lockedCategory ? { category: lockedCategory } : {}) };
  const { data, isPending, isError, refetch } = useProducts(query);

  // Fall back to the server-rendered page until the first client query lands.
  const result = data ?? initialData;
  const facets: ProductFacets | null = result?.facets ?? null;
  const products = result?.items ?? [];
  const meta = result?.meta;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-lg border border-border bg-white p-4">
          <FilterSidebar facets={facets} categories={categories} api={api} />
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {meta ? (
              <>
                <span className="font-semibold text-brand-navy">{meta.total}</span> {heading}
                {meta.totalPages > 1 ? ` · page ${meta.page} of ${meta.totalPages}` : null}
              </>
            ) : (
              'Loading…'
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal />
              Filters
              {api.activeCount > 0 ? <Badge variant="accent">{api.activeCount}</Badge> : null}
            </Button>

            <Select value={api.filters.sort} onValueChange={(value) => api.setFilter({ sort: value })}>
              <SelectTrigger className="h-9 w-[168px]" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="popular">Best selling</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden items-center rounded-lg border border-border sm:flex">
              {([
                ['grid', LayoutGrid, 'Grid view'],
                ['list', List, 'List view'],
              ] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  aria-label={label}
                  aria-pressed={layout === mode}
                  className={cn(
                    'flex size-9 items-center justify-center transition-colors first:rounded-l-lg last:rounded-r-lg',
                    layout === mode ? 'bg-brand-navy text-white' : 'text-brand-navy hover:bg-brand-navy/5',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {isError && !result ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isPending && !result ? (
          <ProductSkeletonGrid />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products match those filters"
            description="Try widening the price range, clearing a brand, or searching by part number instead."
            action={
              api.activeCount > 0 ? (
                <Button variant="outline" size="sm" onClick={api.clearAll}>
                  Clear all filters
                </Button>
              ) : null
            }
          />
        ) : (
          <ul
            className={cn(
              layout === 'grid'
                ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
                : 'flex flex-col gap-3',
            )}
          >
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} layout={layout} priority={index < 4} />
              </li>
            ))}
          </ul>
        )}

        {meta && meta.totalPages > 1 ? (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(page) => {
              api.setFilter({ page });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-8"
          />
        ) : null}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-lg">
          <div className="border-b border-border p-4">
            <DialogTitle>Filters</DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar facets={facets} categories={categories} api={api} />
          </div>
          <div className="border-t border-border p-4">
            <Button variant="cta" block onClick={() => setDrawerOpen(false)}>
              Show {meta?.total ?? 0} products
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </div>
  );
}

function ProductSkeletonGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        // eslint-disable-next-line react/no-array-index-key -- decorative
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
