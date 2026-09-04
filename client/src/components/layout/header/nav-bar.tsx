import Link from 'next/link';
import { FileText } from 'lucide-react';
import { ChinaFlag } from '@/components/shared/china-flag';
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

        {/*
          Two CTAs, deliberately different jobs. China sourcing is highlighted
          because "we can get what we do not stock" is the claim most likely
          to win a buyer who has already been told no somewhere else.
        */}
        <Link
          href="/source-from-china"
          className="flex h-12 items-center gap-2 bg-brand-cyan px-5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          {/*
            The flag replaces the magnifier rather than joining it. Two glyphs
            plus three words in a 48px bar is clutter, and of the two the flag
            is the one carrying information the label does not already give.
          */}
          <ChinaFlag className="h-4 w-6" />
          Source From China
        </Link>

        <Link
          href="/submit-inquiry"
          className="flex h-12 items-center gap-2 bg-white/10 px-5 text-sm font-bold uppercase tracking-wide text-brand-cyan transition-colors hover:bg-brand-cyan hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <FileText className="size-4" aria-hidden />
          Request a Quote
        </Link>
      </div>
    </nav>
  );
}
