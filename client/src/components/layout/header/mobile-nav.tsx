'use client';

import Link from 'next/link';
import { ChevronDown, Mail, Menu, Phone, Search } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/tabs';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { CONTACT } from '@/lib/constants';
import { mockCategories } from '@/lib/mock-data';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { PRIMARY_NAV } from './nav-bar';
import { SearchBar } from './search-bar';

/** Hamburger drawer holding the full category tree and contact details. */
export function MobileDrawer(): JSX.Element {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNav);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <SheetContent side="left" className="w-[min(21rem,88vw)]">
        <div className="flex items-center border-b border-border p-4">
          <Logo height={38} showStrapline={false} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <Accordion type="multiple" className="px-4">
            {mockCategories.map((category) => (
              <AccordionItem key={category.slug} value={category.slug}>
                {category.children.length === 0 ? (
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex py-4 text-sm font-semibold text-brand-navy"
                  >
                    {category.name}
                  </Link>
                ) : (
                  <>
                    <AccordionTrigger>{category.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pl-1">
                        {category.children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/categories/${child.slug}`}
                              onClick={() => setOpen(false)}
                              className="block py-1.5 text-sm text-foreground hover:text-brand-cyan"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                )}
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="border-t border-border px-4 py-2">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-navy"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-border bg-surface p-4 text-sm">
            <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="flex items-center gap-2 text-brand-navy">
              <Phone className="size-4 text-brand-cyan" aria-hidden />
              {CONTACT.mobile}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 text-brand-navy">
              <Mail className="size-4 text-brand-cyan" aria-hidden />
              {CONTACT.email}
            </a>
            <p className="pt-1 text-xs text-muted-foreground">{CONTACT.address.full}</p>
          </div>
        </div>

        <DialogTitle className="sr-only">Site menu</DialogTitle>
      </SheetContent>
    </Dialog>
  );
}

/** Collapsible search row, shown under the main bar on phones. */
export function MobileSearch(): JSX.Element {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearch);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle search"
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 lg:hidden"
      >
        <Search className="size-5" />
        <ChevronDown className={cn('ml-0.5 size-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full animate-slide-down border-b border-border bg-white p-3 lg:hidden">
          <SearchBar autoFocus />
        </div>
      ) : null}
    </>
  );
}
