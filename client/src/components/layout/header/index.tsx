'use client';

import { useScrollPosition } from '@/hooks/use-scroll-position';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { WhatsAppButton } from '../whatsapp-button';
import { HeaderActions } from './cart-buttons';
import { MobileDrawer, MobileSearch } from './mobile-nav';
import { NavBar } from './nav-bar';
import { SearchBar } from './search-bar';
import { TopStrip } from './top-strip';

/**
 * Three-tier site header.
 *
 *   1. Navy top strip  — tagline, phone, email, social (desktop only)
 *   2. White main bar  — logo, search, account, both carts, WhatsApp (sticky)
 *   3. Navy nav bar    — mega-menu + primary navigation (desktop only)
 *
 * Only the main bar sticks. Keeping all three pinned would eat 150 px of a
 * phone viewport, which matters more here than on a desktop-first site.
 */
export function Header(): JSX.Element {
  const scrollY = useScrollPosition();
  const isScrolled = scrollY > 8;

  return (
    <header className="relative">
      <TopStrip />

      <div
        className={cn(
          'sticky top-0 z-header border-b border-border bg-white transition-shadow',
          isScrolled && 'shadow-card',
        )}
      >
        <div className="container flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
          <MobileDrawer />
          <Logo />

          <div className="hidden min-w-0 flex-1 lg:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:gap-3">
            <MobileSearch />
            <HeaderActions />
            <WhatsAppButton className="hidden sm:inline-flex" />
          </div>
        </div>
      </div>

      <NavBar />
    </header>
  );
}
