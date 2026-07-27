'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Plus, Search, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { ProductTable } from '@/components/admin/products/product-table';
import { useAdminProducts, useProductMutations, useTaxonomy, type AdminQuery } from '@/lib/api/admin';
import { useDebounce } from '@/hooks/use-debounce';
import { env } from '@/lib/env';

/** Product listing with search, filters, bulk actions and CSV/XLSX transfer. */
export default function AdminProductsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminQuery>({ sort: 'newest' });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const debounced = useDebounce(search, 300);
  const brands = useTaxonomy('brands');
  const mutations = useProductMutations();

  const query: AdminQuery = {
    ...filters,
    page,
    limit: 20,
    ...(debounced.length >= 2 ? { search: debounced } : {}),
  };
  const { data, isPending } = useAdminProducts(query);

  const setFilter = (key: string, value: string | undefined): void => {
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined || value === 'all') delete next[key];
      else next[key] = value;
      return next;
    });
    setPage(1);
  };

  const activeFilters = Object.keys(filters).filter((key) => key !== 'sort').length;

  const runBulk = (action: string): void => {
    mutations.bulk.mutate(
      { ids: selected, action },
      {
        onSuccess: (result) => {
          toast.success(`${result.modified} product(s) updated`);
          setSelected([]);
        },
        onError: (error) => toast.error('Bulk action failed', { description: error.message }),
      },
    );
  };

  /** Export streams from the API, so link straight at it with the filters applied. */
  const exportHref = `${env.NEXT_PUBLIC_API_URL}/admin/products/export?format=xlsx${
    filters.isActive ? `&isActive=${String(filters.isActive)}` : ''
  }`;

  return (
    <>
      <PageHeader
        title="Products"
        description={data ? `${data.meta.total} products in the catalogue` : 'Loading…'}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Download />
                Export
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products/import">
                <Upload />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="cta" size="sm">
              <Link href="/admin/products/new">
                <Plus />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search name, SKU or part number…"
          aria-label="Search products"
          leadingIcon={<Search />}
          className="h-9 w-full sm:w-72"
        />

        <Select value={String(filters.brand ?? 'all')} onValueChange={(value) => setFilter('brand', value)}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by brand">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {(brands.data ?? []).map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.pricingMode ?? 'all')}
          onValueChange={(value) => setFilter('pricingMode', value)}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by pricing mode">
            <SelectValue placeholder="Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pricing</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="quote">Quote only</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.isActive ?? 'all')} onValueChange={(value) => setFilter('isActive', value)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.lowStock ?? 'all')} onValueChange={(value) => setFilter('lowStock', value)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by stock">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any stock</SelectItem>
            <SelectItem value="true">Low stock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.sort ?? 'newest')} onValueChange={(value) => setFilter('sort', value)}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="price_desc">Price high–low</SelectItem>
            <SelectItem value="stock_asc">Stock low–high</SelectItem>
            <SelectItem value="sales">Best selling</SelectItem>
          </SelectContent>
        </Select>

        {activeFilters > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ sort: 'newest' }); setPage(1); }}>
            <X />
            Clear ({activeFilters})
          </Button>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 p-3">
          <Badge variant="accent">{selected.length} selected</Badge>
          {[
            { action: 'activate', label: 'Activate' },
            { action: 'deactivate', label: 'Deactivate' },
            { action: 'feature', label: 'Feature' },
            { action: 'unfeature', label: 'Unfeature' },
          ].map((item) => (
            <Button key={item.action} variant="outline" size="sm" onClick={() => runBulk(item.action)}>
              {item.label}
            </Button>
          ))}
          <Button variant="danger" size="sm" onClick={() => setBulkAction('delete')}>
            Deactivate &amp; hide
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <ProductTable
        products={data?.items ?? []}
        isLoading={isPending}
        selected={selected}
        onSelectedChange={setSelected}
      />

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={`Deactivate ${selected.length} product(s)?`}
        description="They will be hidden from the storefront. This is a soft delete — order history and existing links keep working."
        confirmLabel="Deactivate all"
        destructive
        isLoading={mutations.bulk.isPending}
        onConfirm={() => {
          runBulk('delete');
          setBulkAction(null);
        }}
      />
    </>
  );
}
