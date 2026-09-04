'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { mockBrands, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * "All Categories" mega-menu.
 *
 * Three columns: the category tree on the left, the hovered category's
 * children in the middle, and featured brands plus a promo panel on the right.
 * Opens on hover for mouse users and on click/keyboard for everyone else.
 */
export function MegaMenu(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(mockCategories[0]?.slug ?? '');

  const active = mockCategories.find((category) => category.slug === activeSlug) ?? mockCategories[0];

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-12 items-center gap-2 bg-brand-cyan px-4 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <LayoutGrid className="size-4" aria-hidden />
        All Categories
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-modal w-[min(64rem,calc(100vw-2rem))] animate-slide-down rounded-b-lg border border-t-0 border-border bg-white shadow-panel">
          <div className="grid grid-cols-12">
            {/* Column 1 — root categories */}
            <ul className="col-span-4 border-r border-border py-2">
              {mockCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onMouseEnter={() => setActiveSlug(category.slug)}
                    onFocus={() => setActiveSlug(category.slug)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      category.slug === activeSlug
                        ? 'bg-brand-navy/5 text-brand-navy'
                        : 'text-foreground hover:bg-brand-navy/5 hover:text-brand-navy',
                    )}
                  >
                    {category.name}
                    {category.children.length > 0 ? (
                      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Column 2 — children of the hovered category */}
            <div className="col-span-5 border-r border-border p-5">
              <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                {active?.name}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {(active?.children ?? []).map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/categories/${child.slug}`}
                      className="block py-1 text-sm text-foreground transition-colors hover:text-brand-cyan"
                    >
                      {child.name}
                    </Link>
                    {child.children ? (
                      <ul className="mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                        {child.children.map((grandchild) => (
                          <li key={grandchild.slug}>
                            <Link
                              href={`/categories/${grandchild.slug}`}
                              className="block py-0.5 text-xs text-muted-foreground transition-colors hover:text-brand-cyan"
                            >
                              {grandchild.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — featured brands + promo */}
            <div className="col-span-3 bg-surface p-5">
              <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                Featured brands
              </p>
              <ul className="mb-5 grid grid-cols-2 gap-1.5">
                {mockBrands.slice(0, 6).map((brand) => (
                  <li key={brand.slug}>
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="flex h-9 items-center justify-center rounded border border-border bg-white px-2 text-[10px] font-bold uppercase text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                    >
                      {brand.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="bg-brand-gradient rounded-lg p-4 text-white">
                <p className="font-heading text-sm font-bold uppercase">Bulk enquiry?</p>
                <p className="mt-1 text-xs text-white/75">
                  Send your bill of materials and get one consolidated quote within a working day.
                </p>
                <Link
                  href="/submit-inquiry"
                  className="mt-3 inline-flex h-8 items-center rounded-md bg-brand-cyan px-3 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-white hover:text-brand-navy"
                >
                  Request a quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
