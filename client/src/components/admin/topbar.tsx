'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, ExternalLink, LogOut, Menu, Search, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/tooltip';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

/**
 * Admin top bar: global search, a notification bell fed by the dashboard's
 * pending counts, and the account menu.
 */
export function AdminTopbar({
  onOpenNav,
  pending,
}: {
  onOpenNav: () => void;
  /** Items needing attention, from `/admin/dashboard/stats`. */
  pending?: { reviews: number; contacts: number; quotations: number };
}): JSX.Element {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const total = (pending?.reviews ?? 0) + (pending?.contacts ?? 0) + (pending?.quotations ?? 0);

  const onSearch = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    if (typeof value === 'string' && value.trim()) {
      router.push(`/admin/products?search=${encodeURIComponent(value.trim())}`);
    }
  };

  const onSignOut = async (): Promise<void> => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    signOut();
    router.push('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="flex size-9 items-center justify-center rounded-md text-brand-navy transition-colors hover:bg-brand-navy/5 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={onSearch} role="search" className="hidden max-w-sm flex-1 sm:block">
        <Input
          name="q"
          type="search"
          placeholder="Search products by name, SKU or part number…"
          aria-label="Search the catalogue"
          leadingIcon={<Search />}
          className="h-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
          <Link href="/" target="_blank">
            <ExternalLink />
            View site
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={total > 0 ? `Notifications (${total} pending)` : 'Notifications'}
              className="relative flex size-9 items-center justify-center rounded-md text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              <Bell className="size-5" />
              {total > 0 ? (
                <span className="absolute right-1 top-1 flex min-w-[16px] justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white">
                  {total > 99 ? '99+' : total}
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
            {total === 0 ? (
              <p className="px-2.5 py-3 text-sm text-muted-foreground">Nothing waiting. All clear.</p>
            ) : (
              <>
                {pending?.quotations ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/quotations?status=new">
                      New quotation requests
                      <Badge variant="accent" className="ml-auto">
                        {pending.quotations}
                      </Badge>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {pending?.reviews ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/reviews">
                      Reviews to moderate
                      <Badge variant="warning" className="ml-auto">
                        {pending.reviews}
                      </Badge>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {pending?.contacts ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/contacts?status=new">
                      Unread enquiries
                      <Badge variant="warning" className="ml-auto">
                        {pending.contacts}
                      </Badge>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-brand-navy/5"
            >
              <Avatar size="sm">
                <AvatarFallback>{initialsOf(user?.name ?? 'Admin')}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left lg:block">
                <span className="block text-xs font-semibold leading-tight text-brand-navy">
                  {user?.name ?? 'Admin'}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {user?.role ?? 'staff'}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/account/profile">
                <UserRound />
                My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void onSignOut()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
