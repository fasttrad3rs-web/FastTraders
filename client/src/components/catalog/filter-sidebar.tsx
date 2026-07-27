'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PriceRangeSlider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/tabs';
import { Chip } from '@/components/ui/badge';
import type { CategoryNode, ProductFacets } from '@/lib/api/types';
import type { CatalogFilterApi } from './use-catalog-filters';

/**
 * Faceted filter sidebar.
 *
 * Counts come from the API's facet aggregation, which computes each dimension
 * with its *own* filter removed — so ticking "Schneider" does not collapse the
 * brand list to a single entry.
 */
export function FilterSidebar({
  facets,
  categories,
  api,
}: {
  facets: ProductFacets | null;
  categories: CategoryNode[];
  api: CatalogFilterApi;
}): JSX.Element {
  const { filters, setFilter, toggleInList, toggleSpec, clearAll, activeCount } = api;

  const bounds = facets?.priceRange ?? { min: 0, max: 200000 };
  const [range, setRange] = useState<[number, number]>([
    filters.minPrice ?? bounds.min,
    filters.maxPrice ?? bounds.max,
  ]);

  const selectedBrands = (filters.brand ?? '').split(',').filter(Boolean);
  const selectedSpecs = (filters.specs ?? '').split('|').filter(Boolean);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Filters {activeCount > 0 ? <span className="text-brand-cyan">({activeCount})</span> : null}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
            Clear all
          </button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {selectedBrands.map((slug) => (
            <Chip key={slug} label={slug} onRemove={() => toggleInList('brand', slug)} />
          ))}
          {selectedSpecs.map((token) => {
            const [key = '', ...rest] = token.split(':');
            return (
              <Chip
                key={token}
                label={rest.join(':')}
                onRemove={() => toggleSpec(key, rest.join(':'))}
              />
            );
          })}
          {filters.inStock ? (
            <Chip label="In stock" onRemove={() => setFilter({ inStock: undefined })} />
          ) : null}
          {filters.pricingMode ? (
            <Chip
              label={filters.pricingMode === 'quote' ? 'Quote only' : filters.pricingMode}
              onRemove={() => setFilter({ pricingMode: undefined })}
            />
          ) : null}
        </div>
      ) : null}

      <Accordion type="multiple" defaultValue={['categories', 'brands', 'price', 'availability']}>
        {categories.length > 0 ? (
          <AccordionItem value="categories">
            <AccordionTrigger>Category</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/categories/${category.slug}`}
                      className="flex items-center justify-between py-1 text-sm text-foreground hover:text-brand-cyan"
                    >
                      {category.name}
                      <span className="text-2xs text-muted-foreground">{category.productCount}</span>
                    </Link>
                    {category.children.length > 0 ? (
                      <ul className="ml-3 border-l border-border pl-3">
                        {category.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/categories/${child.slug}`}
                              className="flex items-center justify-between py-0.5 text-xs text-muted-foreground hover:text-brand-cyan"
                            >
                              {child.name}
                              <span className="text-2xs">{child.productCount}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {facets && facets.brands.length > 0 ? (
          <AccordionItem value="brands">
            <AccordionTrigger>Brand</AccordionTrigger>
            <AccordionContent>
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {facets.brands.map((bucket) => (
                  <li key={bucket.value} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`brand-${bucket.value}`}
                      checked={selectedBrands.includes(bucket.value)}
                      onCheckedChange={() => toggleInList('brand', bucket.value)}
                    />
                    <Label htmlFor={`brand-${bucket.value}`} className="flex-1 font-normal">
                      {bucket.label}
                    </Label>
                    <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="price">
          <AccordionTrigger>Price</AccordionTrigger>
          <AccordionContent>
            <PriceRangeSlider
              min={bounds.min}
              max={bounds.max}
              value={range}
              onValueChange={setRange}
            />
            <Button
              size="sm"
              variant="outline"
              block
              className="mt-3"
              onClick={() => setFilter({ minPrice: range[0], maxPrice: range[1] })}
            >
              Apply price
            </Button>
            <p className="mt-2 text-2xs text-muted-foreground">
              Quote-only products have no listed price and are excluded by this filter.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="availability">
          <AccordionTrigger>Availability &amp; buying</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="filter-instock"
                  checked={filters.inStock === true}
                  onCheckedChange={(checked) => setFilter({ inStock: checked === true })}
                />
                <Label htmlFor="filter-instock" className="font-normal">
                  In stock only
                </Label>
              </div>

              {(facets?.pricingModes ?? []).map((bucket) => (
                <div key={bucket.value} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`mode-${bucket.value}`}
                    checked={filters.pricingMode === bucket.value}
                    onCheckedChange={(checked) =>
                      setFilter({ pricingMode: checked === true ? bucket.value : undefined })
                    }
                  />
                  <Label htmlFor={`mode-${bucket.value}`} className="flex-1 font-normal">
                    {bucket.label}
                  </Label>
                  <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {(facets?.specs ?? []).map((group) => (
          <AccordionItem key={group.key} value={`spec-${group.key}`}>
            <AccordionTrigger>{group.key}</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {group.values.map((bucket) => {
                  const token = `${group.key}:${bucket.value}`;
                  return (
                    <li key={token} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`spec-${token}`}
                        checked={selectedSpecs.includes(token)}
                        onCheckedChange={() => toggleSpec(group.key, bucket.value)}
                      />
                      <Label htmlFor={`spec-${token}`} className="flex-1 font-normal">
                        {bucket.label}
                      </Label>
                      <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
