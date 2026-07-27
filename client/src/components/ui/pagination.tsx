'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Pagination and Breadcrumb. */

/** Build a compact page list: 1 … 4 5 6 … 20 */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const output: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push('gap');
    output.push(page);
    previous = page;
  }
  return output;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}): JSX.Element | null {
  if (totalPages <= 1) return null;

  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(base, 'border-border bg-white text-brand-navy hover:border-brand-navy')}
      >
        <ChevronLeft className="size-4" />
      </button>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          // eslint-disable-next-line react/no-array-index-key -- gaps are positional
          <span key={`gap-${index}`} className="px-1 text-muted-foreground">
            <MoreHorizontal className="size-4" />
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              base,
              entry === page
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-white text-brand-navy hover:border-brand-navy',
            )}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(base, 'border-border bg-white text-brand-navy hover:border-brand-navy')}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link href="/" className="inline-flex items-center hover:text-brand-cyan" aria-label="Home">
            <Home className="size-3.5" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 opacity-50" aria-hidden />
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-brand-cyan">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-brand-navy" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
