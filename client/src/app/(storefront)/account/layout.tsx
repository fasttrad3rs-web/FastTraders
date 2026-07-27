'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/account', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/account/orders', label: 'Orders', Icon: Package },
  { href: '/account/quotations', label: 'Quotations', Icon: FileText },
  { href: '/account/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/account/addresses', label: 'Addresses', Icon: MapPin },
  { href: '/account/profile', label: 'Profile', Icon: UserRound },
  { href: '/account/password', label: 'Password', Icon: KeyRound },
] as const;

/** Account shell: sidebar navigation plus a sign-in guard. */
export default function AccountLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  const onSignOut = async (): Promise<void> => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    signOut();
    router.push('/');
    router.refresh();
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Please sign in"
          description="Your orders, quotations and addresses live behind a sign-in."
          icon={<UserRound />}
          action={
            <Button asChild variant="cta">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'My account' }]} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Avatar>
              <AvatarFallback>{initialsOf(user?.name ?? 'Guest')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-navy">{user?.name}</p>
              <p className="truncate text-2xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <nav aria-label="Account" className="mt-3">
            <ul className="space-y-0.5">
              {NAV.map(({ href, label, Icon }) => {
                const active = href === '/account' ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-navy text-white'
                          : 'text-foreground hover:bg-brand-navy/5 hover:text-brand-navy',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Button
            variant="ghost"
            size="sm"
            block
            className="mt-3 justify-start text-muted-foreground hover:text-destructive"
            onClick={() => void onSignOut()}
          >
            <LogOut />
            Sign out
          </Button>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
