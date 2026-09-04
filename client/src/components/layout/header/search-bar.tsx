'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { mockSearchScopes, mockSuggest, type MockProduct } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * Catalogue search with a scope dropdown and live autocomplete.
 *
 * Trade buyers paste part numbers, so SKU matches rank first and the SKU is
 * shown on every row. Wired to mock data in Phase 5; the only change in
 * Phase 6 is swapping `mockSuggest` for the `/search/suggest` query.
 */
export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }): JSX.Element {
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState('all');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounce(term, 300);
  const results: MockProduct[] = debounced.length >= 2 ? mockSuggest(debounced) : [];

  // Close the panel on an outside click.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') setOpen(false);
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-white focus-within:ring-2 focus-within:ring-brand-cyan"
      >
        <div className="hidden w-44 shrink-0 border-r border-border sm:block">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger
              aria-label="Search within category"
              className="h-11 rounded-none border-0 bg-surface text-xs font-medium focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockSearchScopes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search by product, SKU or part number…"
          // Full combobox semantics: `aria-expanded` is only valid on the
          // combobox role, not on a bare textbox.
          role="combobox"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          className="h-11 min-w-0 flex-1 bg-white px-3 text-sm outline-none placeholder:text-muted-foreground"
        />

        {term ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="px-2 text-muted-foreground transition-colors hover:text-brand-navy"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <button
          type="submit"
          aria-label="Search"
          className="flex h-11 items-center gap-2 bg-brand-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-cyan sm:px-5"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {open && debounced.length >= 2 ? (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-modal max-h-96 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-panel"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No match for “{debounced}”. Try the part number, or{' '}
              <Link href="/submit-inquiry" className="text-brand-cyan underline">
                ask us for a quote
              </Link>
              .
            </p>
          ) : (
            results.map((product, index) => (
              <Link
                key={product.id}
                id={`search-option-${index}`}
                href={`/products/${product.slug}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 transition-colors',
                  index === activeIndex ? 'bg-brand-navy/5' : 'hover:bg-brand-navy/5',
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-surface text-[9px] font-bold text-brand-navy">
                  {product.brand.slice(0, 3).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.sku} · {product.brand}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand-cyan">On request</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
