import Link from 'next/link';
import { FileText } from 'lucide-react';
import { MegaMenu } from './mega-menu';

/** Tier 3: the primary navigation band, navy with a cyan mega-menu launcher. */

export const PRIMARY_NAV = [
  { label: 'Products', href: '/products' },
  { label: 'Brands', href: '/brands' },
  { label: 'Industries', href: '/industries' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

export function NavBar(): JSX.Element {
  return (
    <nav aria-label="Primary" className="hidden bg-brand-navy text-white lg:block">
      <div className="container flex items-stretch">
        <MegaMenu />

        <ul className="flex flex-1 items-stretch">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-12 items-center px-4 text-sm font-semibold uppercase tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/request-quote"
          className="flex h-12 items-center gap-2 bg-white/10 px-5 text-sm font-bold uppercase tracking-wide text-brand-cyan transition-colors hover:bg-brand-cyan hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <FileText className="size-4" aria-hidden />
          Request a Quote
        </Link>
      </div>
    </nav>
  );
}
