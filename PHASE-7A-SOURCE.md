# Fast Traders — Phase 7A source dump
Admin shell, middleware, data layer, dashboard, products and orders.
Total files: 23

---

## `client/src/middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge guard for the admin route group.
 *
 * This is a *first* gate, not the security boundary. It only checks that an
 * access-token cookie is present and decodes to a staff role — the Edge runtime
 * has no access to `JWT_ACCESS_SECRET` and cannot verify the signature. Every
 * admin API route is independently protected by `protect + restrictTo` on the
 * server, so a forged cookie gets a 403 from the API and an empty screen here.
 *
 * The point of this middleware is UX: send a signed-out visitor to /login
 * instead of rendering an admin shell that will fail every request.
 */

const ACCESS_TOKEN_COOKIE = 'ft_access_token';
const STAFF_ROLES = new Set(['admin', 'manager']);

interface TokenPayload {
  role?: unknown;
  exp?: unknown;
}

/** Decode a JWT payload without verifying it. Edge-safe, no Node Buffer. */
function decodePayload(token: string): TokenPayload | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = token ? decodePayload(token) : null;

  const expired = typeof payload?.exp === 'number' && payload.exp * 1000 < Date.now();
  const isStaff = typeof payload?.role === 'string' && STAFF_ROLES.has(payload.role);

  if (!payload || expired || !isStaff) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  // Admin pages must never be cached by a CDN — they are per-user by definition.
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

## `client/src/lib/api/admin.ts`

```ts
'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { Product } from '@/types';
import type { OrderResponse } from './cart.types';

/** Typed hooks over the Phase 4 admin API. */

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  charts: (granularity: string, days: number) => ['admin', 'charts', granularity, days] as const,
  recent: ['admin', 'recent'] as const,
  products: (params: Record<string, unknown>) => ['admin', 'products', params] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  orders: (params: Record<string, unknown>) => ['admin', 'orders', params] as const,
  order: (id: string) => ['admin', 'order', id] as const,
  taxonomy: (kind: string) => ['admin', kind] as const,
};

export interface AdminMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminList<T> {
  items: T[];
  meta: AdminMeta;
  filteredRevenue?: number;
}

/* ------------------------------- Dashboard ------------------------------- */

export interface PeriodRevenue {
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  revenue: { today: PeriodRevenue; week: PeriodRevenue; month: PeriodRevenue; year: PeriodRevenue };
  ordersByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  quotations: { new: number; awaitingResponse: number; total: number };
  inventory: { lowStock: number; outOfStock: number; totalActive: number };
  customers: { newThisMonth: number; total: number };
  averageOrderValue: number;
  quotationConversionRate: number;
  checkoutConversionRate: number;
  pending: { reviews: number; contacts: number };
}

export interface NamedTotal {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface DashboardCharts {
  salesOverTime: { period: string; revenue: number; orders: number }[];
  topProducts: NamedTotal[];
  revenueByCategory: NamedTotal[];
  revenueByBrand: NamedTotal[];
}

export function useAdminStats(): UseQueryResult<DashboardStats> {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async () => unwrap(await apiClient.get<DashboardStats>('/admin/dashboard/stats')),
    staleTime: 60_000,
  });
}

export function useAdminCharts(
  granularity: 'daily' | 'weekly' | 'monthly',
  days: number,
): UseQueryResult<DashboardCharts> {
  return useQuery({
    queryKey: adminKeys.charts(granularity, days),
    queryFn: async () =>
      unwrap(
        await apiClient.get<DashboardCharts>('/admin/dashboard/charts', {
          params: { granularity, days },
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useAdminRecent(): UseQueryResult<Record<string, unknown[]>> {
  return useQuery({
    queryKey: adminKeys.recent,
    queryFn: async () => unwrap(await apiClient.get<Record<string, unknown[]>>('/admin/dashboard/recent')),
    staleTime: 30_000,
  });
}

/* -------------------------------- Products ------------------------------- */

/** Query params are always scalars; the type mirrors the api-client contract. */
export type AdminQuery = Record<string, string | number | boolean | undefined>;

export function useAdminProducts(params: AdminQuery): UseQueryResult<AdminList<Product>> {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<Product>>('/admin/products', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string): UseQueryResult<Product> {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: async () => unwrap(await apiClient.get<Product>(`/admin/products/${id}`)),
    enabled: id.length > 0,
  });
}

/**
 * Product write operations.
 *
 * The status toggle updates optimistically — flipping a switch should feel
 * instant, and the previous list is restored if the request fails.
 */
export function useProductMutations(): {
  create: UseMutationResult<Product, Error, Record<string, unknown>>;
  update: UseMutationResult<Product, Error, { id: string; patch: Record<string, unknown> }>;
  remove: UseMutationResult<Product, Error, string>;
  bulk: UseMutationResult<{ modified: number }, Error, Record<string, unknown>>;
  adjustStock: UseMutationResult<
    { sku: string; previous: number; current: number },
    Error,
    { id: string; mode: 'set' | 'increment' | 'decrement'; quantity: number; reason: string }
  >;
} {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  };

  return {
    create: useMutation({
      mutationFn: async (input) => unwrap(await apiClient.post<Product>('/admin/products', input)),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }) =>
        unwrap(await apiClient.patch<Product>(`/admin/products/${id}`, patch)),
      onSuccess: (product) => {
        queryClient.setQueryData(adminKeys.product(product.id), product);
        invalidate();
      },
    }),
    remove: useMutation({
      mutationFn: async (id) => unwrap(await apiClient.delete<Product>(`/admin/products/${id}`)),
      onSuccess: invalidate,
    }),
    bulk: useMutation({
      mutationFn: async (input) =>
        unwrap(await apiClient.post<{ modified: number }>('/admin/products/bulk', input)),
      onSuccess: invalidate,
    }),
    adjustStock: useMutation({
      mutationFn: async ({ id, ...body }) =>
        unwrap(
          await apiClient.patch<{ sku: string; previous: number; current: number }>(
            `/admin/products/${id}/stock`,
            body,
          ),
        ),
      onSuccess: invalidate,
    }),
  };
}

/* --------------------------------- Orders -------------------------------- */

export function useAdminOrders(params: AdminQuery): UseQueryResult<AdminList<OrderResponse>> {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: async () => unwrap(await apiClient.get<AdminList<OrderResponse>>('/admin/orders', { params })),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string): UseQueryResult<OrderResponse> {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: async () => unwrap(await apiClient.get<OrderResponse>(`/admin/orders/${id}`)),
    enabled: id.length > 0,
  });
}

export function useOrderMutations(id: string): {
  status: UseMutationResult<OrderResponse, Error, { status: string; note?: string; notifyCustomer: boolean }>;
  payment: UseMutationResult<OrderResponse, Error, Record<string, unknown>>;
  tracking: UseMutationResult<OrderResponse, Error, Record<string, unknown>>;
} {
  const queryClient = useQueryClient();
  const onSuccess = (order: OrderResponse): void => {
    queryClient.setQueryData(adminKeys.order(id), order);
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  return {
    status: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/status`, body)),
      onSuccess,
    }),
    payment: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/payment`, body)),
      onSuccess,
    }),
    tracking: useMutation({
      mutationFn: async (body) =>
        unwrap(await apiClient.patch<OrderResponse>(`/admin/orders/${id}/tracking`, body)),
      onSuccess,
    }),
  };
}

/** Taxonomy lists reused by the product form's selects. */
export function useTaxonomy(kind: 'categories' | 'brands'): UseQueryResult<
  { id: string; name: string; slug: string; level?: number }[]
> {
  return useQuery({
    queryKey: adminKeys.taxonomy(kind),
    queryFn: async () =>
      unwrap(await apiClient.get<{ id: string; name: string; slug: string; level?: number }[]>(`/admin/${kind}`)),
    staleTime: 5 * 60_000,
  });
}
```

## `client/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { SITE } from '@/lib/constants';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Industrial & Electrical Equipment, Lahore`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  keywords: [
    'industrial equipment Lahore',
    'electrical equipment Pakistan',
    'circuit breakers Lahore',
    'MCB MCCB ACB supplier',
    'Schneider Electric Pakistan',
    'PLC HMI VFD Lahore',
  ],
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A6B',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-toast rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to content
        </a>

        {/* Storefront chrome lives in app/(storefront)/layout.tsx; the admin
            route group supplies its own shell instead. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## `client/src/app/(storefront)/layout.tsx`

```tsx
import { AnnouncementBar, FloatingWhatsApp, Footer, Header, ScrollToTop } from '@/components/layout';
import { MobileBottomNav } from '@/components/layout/header/mobile-nav';
import { getSettings } from '@/lib/api/catalog';

/**
 * Storefront chrome.
 *
 * Split out of the root layout so `/admin` can render its own shell without
 * inheriting the public header, footer and WhatsApp bubble.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // Announcement copy is editable in the admin panel.
  const settings = await getSettings();
  const announcement = settings?.announcement;

  return (
    <>
      {announcement?.isActive ? (
        <AnnouncementBar text={announcement.text} link={announcement.link} />
      ) : null}

      <Header />

      {/* Bottom padding clears the sticky mobile nav. */}
      <main id="main" className="pb-16 lg:pb-0">
        {children}
      </main>

      <Footer />

      <FloatingWhatsApp />
      <ScrollToTop />
      <MobileBottomNav />
    </>
  );
}
```

## `client/src/app/admin/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';

/**
 * Admin route group.
 *
 * `middleware.ts` redirects anyone without a staff token before this renders,
 * and every underlying API route enforces `protect + restrictTo` server-side.
 */
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Fast Traders Admin' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return <AdminShell>{children}</AdminShell>;
}
```

## `client/src/components/admin/primitives.tsx`

```tsx
'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

/** Small building blocks shared across the admin screens. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * KPI tile.
 *
 * `change` is a percentage against the previous equivalent period. Direction
 * is colour-coded, but for a metric like "out of stock" a rise is bad, so
 * `invertChange` flips the colour without flipping the arrow.
 */
export function StatCard({
  label,
  value,
  change,
  hint,
  Icon,
  invertChange,
  loading,
}: {
  label: string;
  value: string | number;
  change?: number;
  hint?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  invertChange?: boolean;
  loading?: boolean;
}): JSX.Element {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    );
  }

  const rising = typeof change === 'number' && change > 0;
  const flat = typeof change === 'number' && change === 0;
  const good = invertChange ? !rising : rising;

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-brand-cyan" /> : null}
      </div>

      <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-brand-navy">{value}</p>

      {typeof change === 'number' ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
            flat ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive',
          )}
        >
          {flat ? (
            <Minus className="size-3" aria-hidden />
          ) : rising ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )}
          {Math.abs(change).toFixed(1)}%
          <span className="font-normal text-muted-foreground">vs previous period</span>
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Confirmation dialog for anything destructive. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  isLoading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'cta'}
            isLoading={isLoading}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## `client/src/components/admin/shell.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { useAdminStats } from '@/lib/api/admin';
import { AdminSidebar } from './sidebar';
import { AdminTopbar } from './topbar';

/**
 * Admin chrome: fixed sidebar on desktop, drawer on tablet and below.
 *
 * Responsive down to tablet as specified — below `lg` the sidebar becomes a
 * sheet so the content column keeps its full width for data tables.
 */
export function AdminShell({ children }: { children: React.ReactNode }): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { data: stats } = useAdminStats();

  const pending = stats
    ? {
        reviews: stats.pending.reviews,
        contacts: stats.pending.contacts,
        quotations: stats.quotations.new,
      }
    : undefined;

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <div className="hidden shrink-0 lg:block">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </div>

      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-60 border-0 p-0">
          <DialogTitle className="sr-only">Admin navigation</DialogTitle>
          <AdminSidebar collapsed={false} onToggle={() => setNavOpen(false)} />
        </SheetContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenNav={() => setNavOpen(true)} pending={pending} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
```

## `client/src/components/admin/sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Mail,
  Package,
  ScrollText,
  Settings,
  Star,
  Tags,
  Ticket,
  Users,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Admin sidebar — dark navy, collapsible to an icon rail.
 *
 * Grouped rather than one flat list: Sharjeel's daily path is Orders and
 * Quotations, and burying those in a 15-item list would cost him time.
 */

const GROUPS: { label: string; items: { href: string; label: string; Icon: typeof Package }[] }[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    label: 'Sell',
    items: [
      { href: '/admin/orders', label: 'Orders', Icon: Package },
      { href: '/admin/quotations', label: 'Quotations', Icon: FileText },
      { href: '/admin/customers', label: 'Customers', Icon: Users },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', Icon: Boxes },
      { href: '/admin/categories', label: 'Categories', Icon: Tags },
      { href: '/admin/brands', label: 'Brands', Icon: Star },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/banners', label: 'Banners', Icon: ImageIcon },
      { href: '/admin/coupons', label: 'Coupons', Icon: Ticket },
      { href: '/admin/newsletter', label: 'Newsletter', Icon: Mail },
      { href: '/admin/reviews', label: 'Reviews', Icon: Star },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/contacts', label: 'Enquiries', Icon: Inbox },
      { href: '/admin/reports', label: 'Reports', Icon: BarChart3 },
      { href: '/admin/audit-logs', label: 'Audit log', Icon: ScrollText },
      { href: '/admin/settings', label: 'Settings', Icon: Settings },
    ],
  },
];

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}): JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Admin"
      className={cn(
        'flex h-full flex-col bg-brand-dark text-white transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <Link href="/admin" className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-brand-cyan text-xs font-extrabold text-white">
            FT
          </span>
          {!collapsed ? (
            <span className="truncate font-heading text-sm font-bold uppercase tracking-tight">
              Fast Traders
            </span>
          ) : null}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed ? (
              <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {group.label}
              </p>
            ) : null}

            <ul className="space-y-0.5 px-2">
              {group.items.map(({ href, label, Icon }) => {
                const active = isActive(href);
                const link = (
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-cyan text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed ? <span className="truncate">{label}</span> : null}
                  </Link>
                );

                return (
                  <li key={href}>
                    {collapsed ? (
                      <Tooltip content={label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="flex h-11 shrink-0 items-center justify-center gap-2 border-t border-white/10 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} aria-hidden />
        {!collapsed ? 'Collapse' : null}
      </button>
    </nav>
  );
}
```

## `client/src/components/admin/topbar.tsx`

```tsx
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
```

## `client/src/components/admin/dashboard/charts.tsx`

```tsx
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/feedback';
import { formatPKR } from '@/lib/utils';
import type { DashboardCharts, NamedTotal } from '@/lib/api/admin';

/**
 * Dashboard charts.
 *
 * Palette is deliberately narrow — navy and cyan carry the data, with amber
 * and green reserved for status meaning. A rainbow would fight the brand.
 */
const NAVY = '#1B2A6B';
const CYAN = '#00AEEF';
const STATUS_COLOURS: Record<string, string> = {
  pending: '#D9A21B',
  confirmed: '#1B2A6B',
  processing: '#3F51A8',
  shipped: '#00AEEF',
  delivered: '#1F8A5F',
  cancelled: '#B23B3B',
  returned: '#8A8F99',
};

/** Compact axis labels: 1.9M rather than 1,915,420. */
function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #D8DEE9',
    fontSize: 12,
    fontFamily: 'var(--font-inter)',
  },
} as const;

export function RevenueChart({ data }: { data: DashboardCharts['salesOverTime'] }): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No sales in this period" description="Pick a wider date range." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <RechartsTooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) =>
            name === 'revenue' ? [formatPKR(value), 'Revenue'] : [value, 'Orders']
          }
        />
        <Line type="monotone" dataKey="revenue" stroke={NAVY} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="orders" stroke={CYAN} strokeWidth={2} dot={false} yAxisId={0} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OrdersDonut({ data }: { data: Record<string, number> }): JSX.Element {
  const slices = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }));

  if (slices.length === 0) {
    return <EmptyState title="No orders yet" description="Order statuses will appear here." />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
          {slices.map((slice) => (
            <Cell key={slice.name} fill={STATUS_COLOURS[slice.name] ?? '#8A8F99'} />
          ))}
        </Pie>
        <RechartsTooltip {...tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value: string) => <span className="text-xs capitalize text-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars — product and brand names are too long for vertical ticks. */
export function TotalsBarChart({
  data,
  colour = NAVY,
}: {
  data: NamedTotal[];
  colour?: string;
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No data yet" description="This fills in once orders come through." />;
  }

  const rows = data.slice(0, 8).map((row) => ({
    ...row,
    label: row.name.length > 28 ? `${row.name.slice(0, 27)}…` : row.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" horizontal={false} />
        <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip {...tooltipStyle} formatter={(value: number) => [formatPKR(value), 'Revenue']} />
        <Bar dataKey="revenue" fill={colour} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## `client/src/components/admin/dashboard/recent.tsx`

```tsx
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/feedback';
import { formatDate, formatPKR } from '@/lib/utils';

/**
 * Recent activity: latest orders and quotations side by side.
 *
 * The `/admin/dashboard/recent` endpoint returns loosely typed collections, so
 * each row is read through narrow accessors rather than casting the payload.
 */

type Row = Record<string, unknown>;

const str = (row: Row, key: string): string => (typeof row[key] === 'string' ? (row[key] as string) : '');
const num = (row: Row, key: string): number => (typeof row[key] === 'number' ? (row[key] as number) : 0);
const customerName = (row: Row): string => {
  const customer = row.customer;
  if (customer && typeof customer === 'object' && 'name' in customer) {
    const name = (customer as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
};

export function RecentActivity({ data }: { data?: Record<string, unknown[]> }): JSX.Element {
  const orders = (data?.orders ?? []) as Row[];
  const quotations = (data?.quotations ?? []) as Row[];

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Panel title="Recent orders" href="/admin/orders" loading={!data}>
        {orders.length === 0 ? (
          <Empty label="No orders yet." />
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 6).map((order) => (
              <li key={str(order, 'orderNumber')} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/orders/${str(order, '_id') || str(order, 'id')}`}
                    className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(order, 'orderNumber')}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {customerName(order)} · {formatDate(str(order, 'createdAt'))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="muted">{str(order, 'orderStatus')}</Badge>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatPKR(num(order, 'total'))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent quotations" href="/admin/quotations" loading={!data}>
        {quotations.length === 0 ? (
          <Empty label="No quotation requests yet." />
        ) : (
          <ul className="divide-y divide-border">
            {quotations.slice(0, 6).map((quote) => (
              <li key={str(quote, 'quoteNumber')} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/quotations/${str(quote, '_id') || str(quote, 'id')}`}
                    className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(quote, 'quoteNumber')}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {customerName(quote)} · {formatDate(str(quote, 'createdAt'))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={str(quote, 'status') === 'new' ? 'accent' : 'muted'}>
                    {str(quote, 'status')}
                  </Badge>
                  <span className="text-xs font-semibold tabular-nums">
                    {num(quote, 'quotedTotal') > 0 ? formatPKR(num(quote, 'quotedTotal')) : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  href,
  loading,
  children,
}: {
  title: string;
  href: string;
  loading: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">{title}</h2>
        <Link href={href} className="text-xs font-medium text-brand-cyan hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Empty({ label }: { label: string }): JSX.Element {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
```

## `client/src/components/admin/products/form-schema.ts`

```ts
import { z } from 'zod';

/** Admin product form schema — mirrors the Phase 4 server validator. */

export const specRow = z.object({
  key: z.string().trim().min(1, 'Required').max(80),
  value: z.string().trim().min(1, 'Required').max(200),
  group: z.string().trim().max(60).optional(),
});

export const variantRow = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  sku: z.string().trim().min(1, 'Required').max(60),
  price: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const datasheetRow = z.object({
  title: z.string().trim().min(1, 'Required').max(160),
  url: z.string().url('Must be a URL'),
  publicId: z.string().trim().min(1).default('manual'),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, 'At least 3 characters').max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphen-separated')
      .optional()
      .or(z.literal('')),
    sku: z.string().trim().min(1, 'SKU is required').max(60),
    partNumber: z.string().trim().max(80).optional().or(z.literal('')),
    description: z.string().trim().min(10, 'Add a description').max(20000),
    shortDescription: z.string().trim().max(400).optional().or(z.literal('')),

    category: z.string().min(1, 'Choose a category'),
    subCategory: z.string().optional().or(z.literal('')),
    brand: z.string().min(1, 'Choose a brand'),

    pricingMode: z.enum(['retail', 'quote', 'both']),
    price: z.coerce.number().nonnegative().optional(),
    comparePrice: z.coerce.number().nonnegative().optional(),
    costPrice: z.coerce.number().nonnegative().optional(),
    taxRate: z.coerce.number().min(0).max(100).default(18),

    stock: z.coerce.number().int().nonnegative().default(0),
    lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).default('piece'),
    minOrderQty: z.coerce.number().int().positive().default(1),

    specifications: z.array(specRow).max(60).default([]),
    variants: z.array(variantRow).max(40).default([]),
    datasheets: z.array(datasheetRow).max(10).default([]),
    tags: z.string().trim().max(400).optional().or(z.literal('')),
    warranty: z.string().trim().max(120).optional().or(z.literal('')),

    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isActive: z.boolean().default(true),

    seoTitle: z.string().trim().max(70).optional().or(z.literal('')),
    seoDescription: z.string().trim().max(180).optional().or(z.literal('')),
    seoKeywords: z.string().trim().max(400).optional().or(z.literal('')),
  })
  .refine((data) => data.pricingMode === 'quote' || typeof data.price === 'number', {
    message: 'A price is required unless the product is quote-only',
    path: ['price'],
  })
  .refine(
    (data) =>
      data.comparePrice === undefined || data.price === undefined || data.comparePrice > data.price,
    { message: 'Compare price must be higher than the selling price', path: ['comparePrice'] },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

/** Turn a product name into a URL slug. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Map form values onto the admin API payload. */
export function toApiPayload(values: ProductFormValues): Record<string, unknown> {
  const csv = (value?: string): string[] =>
    value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

  return {
    name: values.name,
    ...(values.slug ? { slug: values.slug } : {}),
    sku: values.sku,
    ...(values.partNumber ? { partNumber: values.partNumber } : {}),
    description: values.description,
    ...(values.shortDescription ? { shortDescription: values.shortDescription } : {}),
    category: values.category,
    subCategory: values.subCategory || null,
    brand: values.brand,
    pricingMode: values.pricingMode,
    ...(values.pricingMode !== 'quote' && typeof values.price === 'number' ? { price: values.price } : {}),
    ...(typeof values.comparePrice === 'number' ? { comparePrice: values.comparePrice } : {}),
    ...(typeof values.costPrice === 'number' ? { costPrice: values.costPrice } : {}),
    taxRate: values.taxRate,
    stock: values.stock,
    lowStockThreshold: values.lowStockThreshold,
    unit: values.unit,
    minOrderQty: values.minOrderQty,
    specifications: values.specifications,
    variants: values.variants.map((variant) => ({ ...variant, attributes: {} })),
    tags: csv(values.tags),
    ...(values.warranty ? { warranty: values.warranty } : {}),
    isFeatured: values.isFeatured,
    isNewArrival: values.isNewArrival,
    isBestSeller: values.isBestSeller,
    isActive: values.isActive,
    seo: {
      ...(values.seoTitle ? { title: values.seoTitle } : {}),
      ...(values.seoDescription ? { description: values.seoDescription } : {}),
      keywords: csv(values.seoKeywords),
    },
  };
}
```

## `client/src/components/admin/products/form-tabs.tsx`

```tsx
'use client';

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import type { ProductFormValues } from './form-schema';

/** Panels for the product form's seven tabs. */

type Form = UseFormReturn<ProductFormValues>;
type Taxonomy = { id: string; name: string; level?: number }[];

export function BasicTab({ form, categories, brands }: { form: Form; categories: Taxonomy; brands: Taxonomy }): JSX.Element {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="pf-name" required error={errors.name?.message}>
          <Input id="pf-name" {...register('name')} hasError={Boolean(errors.name)} />
        </Field>
        <Field label="URL slug" htmlFor="pf-slug" hint="Generated from the name; edit only if you must." error={errors.slug?.message}>
          <Input id="pf-slug" className="font-mono text-xs" {...register('slug')} hasError={Boolean(errors.slug)} />
        </Field>
        <Field label="SKU" htmlFor="pf-sku" required error={errors.sku?.message}>
          <Input id="pf-sku" className="font-mono" {...register('sku')} hasError={Boolean(errors.sku)} />
        </Field>
        <Field label="Manufacturer part number" htmlFor="pf-mpn" hint="What trade buyers search by.">
          <Input id="pf-mpn" className="font-mono" {...register('partNumber')} />
        </Field>
        <Field label="Category" htmlFor="pf-category" required error={errors.category?.message}>
          <Select value={watch('category')} onValueChange={(value) => setValue('category', value, { shouldDirty: true })}>
            <SelectTrigger id="pf-category"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {'— '.repeat(item.level ?? 0)}{item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Brand" htmlFor="pf-brand" required error={errors.brand?.message}>
          <Select value={watch('brand')} onValueChange={(value) => setValue('brand', value, { shouldDirty: true })}>
            <SelectTrigger id="pf-brand"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {brands.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Short description" htmlFor="pf-short" hint="One line, shown on cards and in search results.">
        <Textarea id="pf-short" rows={2} {...register('shortDescription')} />
      </Field>

      <Field
        label="Full description"
        htmlFor="pf-desc"
        required
        hint="Basic HTML is supported: <p>, <strong>, <ul>, <li>."
        error={errors.description?.message}
      >
        <Textarea id="pf-desc" rows={8} className="font-mono text-xs" {...register('description')} hasError={Boolean(errors.description)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags" htmlFor="pf-tags" hint="Comma separated — these feed search and filters.">
          <Input id="pf-tags" placeholder="mccb, 250a, schneider" {...register('tags')} />
        </Field>
        <Field label="Warranty" htmlFor="pf-warranty">
          <Input id="pf-warranty" placeholder="12 months manufacturer warranty" {...register('warranty')} />
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</legend>
        {([
          ['isActive', 'Active — visible on the storefront'],
          ['isFeatured', 'Featured on the homepage'],
          ['isNewArrival', 'New arrival'],
          ['isBestSeller', 'Best seller'],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2.5">
            <Checkbox
              id={`pf-${key}`}
              checked={watch(key)}
              onCheckedChange={(checked) => setValue(key, checked === true, { shouldDirty: true })}
            />
            <Label htmlFor={`pf-${key}`} className="font-normal">{label}</Label>
          </div>
        ))}
      </fieldset>
    </div>
  );
}

export function PricingTab({ form }: { form: Form }): JSX.Element {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;
  const mode = watch('pricingMode');

  return (
    <div className="space-y-4">
      <Field label="Pricing mode" htmlFor="pf-mode" required>
        <Select value={mode} onValueChange={(value) => setValue('pricingMode', value as ProductFormValues['pricingMode'], { shouldDirty: true })}>
          <SelectTrigger id="pf-mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Retail — priced and buyable online</SelectItem>
            <SelectItem value="quote">Quote only — price hidden, RFQ</SelectItem>
            <SelectItem value="both">Both — priced, with a bulk-quote option</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {mode === 'quote' ? (
        <Alert variant="info" className="text-xs">
          Quote-only products show &ldquo;Price on request&rdquo; and go to the inquiry cart. No price
          is published, and none is written into the product schema for Google.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Selling price (Rs.)" htmlFor="pf-price" required={mode !== 'quote'} error={errors.price?.message}>
          <Input id="pf-price" type="number" min={0} step="0.01" disabled={mode === 'quote'} {...register('price')} hasError={Boolean(errors.price)} />
        </Field>
        <Field label="Compare-at price (Rs.)" htmlFor="pf-compare" hint="Shown struck through." error={errors.comparePrice?.message}>
          <Input id="pf-compare" type="number" min={0} step="0.01" disabled={mode === 'quote'} {...register('comparePrice')} hasError={Boolean(errors.comparePrice)} />
        </Field>
        <Field label="Cost price (Rs.)" htmlFor="pf-cost" hint="Internal only. Never exposed publicly.">
          <Input id="pf-cost" type="number" min={0} step="0.01" {...register('costPrice')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tax rate (%)" htmlFor="pf-tax">
          <Input id="pf-tax" type="number" min={0} max={100} {...register('taxRate')} />
        </Field>
        <Field label="Stock on hand" htmlFor="pf-stock" hint="Use the stock adjustment action for audited changes.">
          <Input id="pf-stock" type="number" min={0} {...register('stock')} />
        </Field>
        <Field label="Low-stock threshold" htmlFor="pf-threshold">
          <Input id="pf-threshold" type="number" min={0} {...register('lowStockThreshold')} />
        </Field>
        <Field label="Minimum order qty" htmlFor="pf-moq">
          <Input id="pf-moq" type="number" min={1} {...register('minOrderQty')} />
        </Field>
      </div>

      <Field label="Unit" htmlFor="pf-unit">
        <Select value={watch('unit')} onValueChange={(value) => setValue('unit', value as ProductFormValues['unit'], { shouldDirty: true })}>
          <SelectTrigger id="pf-unit" className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['piece', 'meter', 'roll', 'box', 'set'] as const).map((unit) => (
              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/** Generic repeater used by specifications, variants and datasheets. */
export function RepeaterTab({
  form,
  name,
  columns,
  addLabel,
  emptyHint,
}: {
  form: Form;
  name: 'specifications' | 'variants' | 'datasheets';
  columns: { key: string; label: string; placeholder?: string; type?: string; width?: string }[];
  addLabel: string;
  emptyHint: string;
}): JSX.Element {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name });

  const blank = Object.fromEntries(columns.map((column) => [column.key, ''])) as never;

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.id} className="flex items-start gap-2 rounded-lg border border-border bg-white p-2">
              <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                {columns.map((column) => (
                  <Input
                    key={column.key}
                    type={column.type ?? 'text'}
                    placeholder={column.placeholder ?? column.label}
                    aria-label={`${column.label} for row ${index + 1}`}
                    className={column.width}
                    {...register(`${name}.${index}.${column.key}` as never)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove row ${index + 1}`}
                className="mt-1 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => append(blank)}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}

export function SeoTab({ form }: { form: Form }): JSX.Element {
  const { register, watch } = form;
  const title = watch('seoTitle') || `${watch('name')} | Fast Traders`;
  const description = watch('seoDescription') || watch('shortDescription') || '';

  return (
    <div className="space-y-4">
      <Field label="SEO title" htmlFor="pf-seo-title" hint="Max 70 characters. Falls back to the product name.">
        <Input id="pf-seo-title" maxLength={70} {...register('seoTitle')} />
      </Field>
      <Field label="Meta description" htmlFor="pf-seo-desc" hint="Max 180 characters.">
        <Textarea id="pf-seo-desc" rows={3} maxLength={180} {...register('seoDescription')} />
      </Field>
      <Field label="Keywords" htmlFor="pf-seo-kw" hint="Comma separated.">
        <Input id="pf-seo-kw" placeholder="mccb lahore, 250a breaker price" {...register('seoKeywords')} />
      </Field>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
          Google preview
        </p>
        <p className="text-sm text-[#1a0dab]">{title.slice(0, 70)}</p>
        <p className="text-xs text-[#006621]">www.fasttraders.co › products › {watch('slug') || '…'}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description.slice(0, 180)}</p>
      </div>
    </div>
  );
}
```

## `client/src/components/admin/products/image-manager.tsx`

```tsx
'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { apiClient, unwrap } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Product, ProductImage } from '@/types';

/**
 * Product image manager: drag-and-drop upload, reorder, set primary, delete.
 *
 * Only available once the product exists — uploads post to
 * `/admin/products/:id/images`, so there is no id to attach them to while the
 * create form is still unsaved. The tab says so rather than silently failing.
 */
export function ProductImageManager({ product }: { product?: Product }): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!product) {
    return (
      <Alert variant="info" title="Save the product first">
        Images upload straight to Cloudinary against the product&rsquo;s id, so this tab unlocks once
        you have created the product. Everything else on the form can be filled in now.
      </Alert>
    );
  }

  const upload = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;

    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));

    setUploading(true);
    try {
      const next = unwrap(await apiClient.post<ProductImage[]>(`/admin/products/${product.id}/images`, form));
      setImages(next);
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Check the file type and size (max 5 MB).',
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (publicId: string): Promise<void> => {
    try {
      const next = unwrap(
        await apiClient.delete<ProductImage[]>(
          `/admin/products/${product.id}/images/${encodeURIComponent(publicId)}`,
        ),
      );
      setImages(next);
      toast.success('Image removed');
    } catch (error) {
      toast.error('Could not remove', { description: error instanceof Error ? error.message : undefined });
    }
  };

  /** Reorder is local-only until the form is saved; index 0 is the primary. */
  const reorder = (from: number, to: number): void => {
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next.map((image, index) => ({ ...image, isPrimary: index === 0 }));
    });
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-brand-cyan bg-brand-cyan/5' : 'border-border bg-surface',
        )}
      >
        <UploadCloud className="size-8 text-brand-cyan" aria-hidden />
        <p className="text-sm font-medium text-brand-navy">Drag images here, or</p>
        <Button type="button" variant="outline" size="sm" isLoading={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus />
          Choose files
        </Button>
        <p className="text-2xs text-muted-foreground">JPEG, PNG, WebP or AVIF · max 5 MB · up to 8 at once</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No images yet — the storefront will show the branded placeholder with the SKU.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.publicId}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) reorder(dragIndex, index);
                setDragIndex(null);
              }}
              className={cn(
                'group relative cursor-grab overflow-hidden rounded-lg border bg-white',
                index === 0 ? 'border-brand-cyan' : 'border-border',
              )}
            >
              <div className="relative aspect-square">
                <Image src={image.url} alt={image.alt} fill sizes="200px" className="object-contain" />
              </div>

              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-brand-cyan px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  <Star className="size-2.5" aria-hidden />
                  Primary
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-1 border-t border-border p-1.5">
                {index !== 0 ? (
                  <button
                    type="button"
                    onClick={() => reorder(index, 0)}
                    className="text-[10px] font-medium text-brand-cyan hover:underline"
                  >
                    Make primary
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Shown first</span>
                )}
                <button
                  type="button"
                  onClick={() => void remove(image.publicId)}
                  aria-label={`Remove image ${index + 1}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## `client/src/components/admin/products/product-form.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Save } from 'lucide-react';
import { Badge, StockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriceDisplay } from '@/components/ui/commerce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { ProductImageManager } from './image-manager';
import { BasicTab, PricingTab, RepeaterTab, SeoTab } from './form-tabs';
import { productFormSchema, slugFromName, toApiPayload, type ProductFormValues } from './form-schema';
import { useProductMutations, useTaxonomy } from '@/lib/api/admin';
import type { Product } from '@/types';

/**
 * Product create/edit form.
 *
 * Seven tabs plus a live preview column showing the card as a shopper will see
 * it — which is the fastest way to catch a wrong pricing mode or a missing
 * price before saving.
 */
export function ProductForm({ product }: { product?: Product }): JSX.Element {
  const router = useRouter();
  const mutations = useProductMutations();
  const categories = useTaxonomy('categories');
  const brands = useTaxonomy('brands');

  const isEdit = product !== undefined;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          partNumber: product.partNumber ?? '',
          description: product.description,
          shortDescription: product.shortDescription ?? '',
          category: typeof product.category === 'string' ? product.category : product.category.id,
          subCategory:
            product.subCategory && typeof product.subCategory !== 'string' ? product.subCategory.id : '',
          brand: typeof product.brand === 'string' ? product.brand : product.brand.id,
          pricingMode: product.pricingMode,
          price: product.price,
          comparePrice: product.comparePrice,
          taxRate: product.taxRate,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          unit: product.unit,
          minOrderQty: product.minOrderQty,
          specifications: product.specifications,
          variants: product.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
          })),
          datasheets: product.datasheets,
          tags: product.tags.join(', '),
          warranty: product.warranty ?? '',
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          isBestSeller: product.isBestSeller,
          isActive: product.isActive,
          seoTitle: product.seo?.title ?? '',
          seoDescription: product.seo?.description ?? '',
          seoKeywords: product.seo?.keywords.join(', ') ?? '',
        }
      : {
          pricingMode: 'retail',
          taxRate: 18,
          stock: 0,
          lowStockThreshold: 5,
          unit: 'piece',
          minOrderQty: 1,
          specifications: [],
          variants: [],
          datasheets: [],
          isActive: true,
          isFeatured: false,
          isNewArrival: false,
          isBestSeller: false,
        },
  });

  const { watch, setValue, handleSubmit, formState } = form;
  const name = watch('name');
  const slug = watch('slug');

  // Auto-slug from the name, but never overwrite a slug on an existing
  // product — changing it would break inbound links and search rankings.
  useEffect(() => {
    if (isEdit || !name) return;
    if (!slug || slug === slugFromName(name.slice(0, -1))) {
      setValue('slug', slugFromName(name));
    }
  }, [name, slug, isEdit, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = toApiPayload(values);

    try {
      if (isEdit) {
        await mutations.update.mutateAsync({ id: product.id, patch: payload });
        toast.success('Product saved');
      } else {
        const created = await mutations.create.mutateAsync(payload);
        toast.success('Product created', { description: created.name });
        router.push(`/admin/products/${created.id}/edit`);
      }
    } catch (error) {
      toast.error('Could not save', {
        description: error instanceof Error ? error.message : 'Please check the form and try again.',
      });
    }
  });

  const errorCount = Object.keys(formState.errors).length;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
      <div className="rounded-lg border border-border bg-white p-5">
        {errorCount > 0 ? (
          <Alert variant="danger" title={`${errorCount} field(s) need attention`} className="mb-4">
            Check the highlighted tabs before saving.
          </Alert>
        ) : null}

        <Tabs defaultValue="basic">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="basic">Basic info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing &amp; stock</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicTab form={form} categories={categories.data ?? []} brands={brands.data ?? []} />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab form={form} />
          </TabsContent>

          <TabsContent value="images">
            <ProductImageManager product={product} />
          </TabsContent>

          <TabsContent value="specs">
            <RepeaterTab
              form={form}
              name="specifications"
              addLabel="Add specification"
              emptyHint="No specifications yet. These are what part-number searches match on — add the rating, poles and breaking capacity."
              columns={[
                { key: 'group', label: 'Group', placeholder: 'Electrical' },
                { key: 'key', label: 'Name', placeholder: 'Rated Current' },
                { key: 'value', label: 'Value', placeholder: '250 A' },
              ]}
            />
          </TabsContent>

          <TabsContent value="variants">
            <RepeaterTab
              form={form}
              name="variants"
              addLabel="Add variant"
              emptyHint="No variants. Add one per pole count or current rating if this product ships in several forms."
              columns={[
                { key: 'name', label: 'Name', placeholder: '3P 250A' },
                { key: 'sku', label: 'SKU', placeholder: 'SCH-CVS250-3P' },
                { key: 'stock', label: 'Stock', type: 'number' },
              ]}
            />
          </TabsContent>

          <TabsContent value="datasheets">
            <RepeaterTab
              form={form}
              name="datasheets"
              addLabel="Add datasheet"
              emptyHint="No datasheets linked. Paste a Cloudinary URL, or upload the PDF from the Images tab."
              columns={[
                { key: 'title', label: 'Title', placeholder: 'CVS100F technical datasheet' },
                { key: 'url', label: 'URL', placeholder: 'https://res.cloudinary.com/…' },
              ]}
            />
          </TabsContent>

          <TabsContent value="seo">
            <SeoTab form={form} />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="sticky top-6 space-y-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            <Eye className="size-3.5" aria-hidden />
            Live preview
          </p>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-2xs font-bold uppercase text-brand-cyan">
                {brands.data?.find((brand) => brand.id === watch('brand'))?.name ?? 'Brand'}
              </span>
              <StockBadge
                status={
                  watch('stock') <= 0
                    ? 'out_of_stock'
                    : watch('stock') <= watch('lowStockThreshold')
                      ? 'low_stock'
                      : 'in_stock'
                }
              />
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground">
              {name || 'Product name'}
            </p>
            <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{watch('sku') || 'SKU'}</p>
            <div className="mt-3">
              <PriceDisplay
                price={watch('price')}
                comparePrice={watch('comparePrice')}
                pricingMode={watch('pricingMode')}
                size="sm"
                unit={watch('unit')}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {watch('isActive') ? null : <Badge variant="muted">Inactive</Badge>}
              {watch('isFeatured') ? <Badge variant="accent">Featured</Badge> : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <Button
            type="submit"
            variant="cta"
            block
            isLoading={mutations.create.isPending || mutations.update.isPending}
            loadingText="Saving…"
          >
            <Save />
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="ghost" block className="mt-2" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </aside>
    </form>
  );
}
```

## `client/src/components/admin/products/product-table.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Copy, Download, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react';
import { Badge, StockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/admin/primitives';
import { useProductMutations } from '@/lib/api/admin';
import { cn, formatPKR } from '@/lib/utils';
import type { Product } from '@/types';

/** Admin product table: selection, inline status toggle, row actions. */

const MODE_VARIANT = { retail: 'success', quote: 'accent', both: 'default' } as const;

function stockTone(product: Product): string {
  if (product.stock <= 0) return 'text-destructive';
  if (product.stock <= product.lowStockThreshold) return 'text-warning';
  return 'text-foreground';
}

export function ProductTable({
  products,
  isLoading,
  selected,
  onSelectedChange,
}: {
  products: Product[];
  isLoading: boolean;
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
}): JSX.Element {
  const mutations = useProductMutations();
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const allSelected = products.length > 0 && selected.length === products.length;

  const toggleAll = (): void =>
    onSelectedChange(allSelected ? [] : products.map((product) => product.id));

  const toggleOne = (id: string): void =>
    onSelectedChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  const toggleActive = (product: Product): void => {
    mutations.update.mutate(
      { id: product.id, patch: { isActive: !product.isActive } },
      {
        onSuccess: () =>
          toast.success(product.isActive ? 'Product deactivated' : 'Product activated', {
            description: product.name,
          }),
        onError: (error) => toast.error('Could not update', { description: error.message }),
      },
    );
  };

  if (isLoading) return <TableSkeleton rows={8} />;

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products match those filters"
        description="Try clearing a filter, or add your first product."
        action={
          <Button asChild variant="cta" size="sm">
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <tr>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all products on this page"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="hidden md:table-cell">Brand</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead>Pricing</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="w-10" />
          </tr>
        </TableHeader>

        <TableBody>
          {products.map((product) => {
            const brand = typeof product.brand === 'string' ? null : product.brand;
            const category = typeof product.category === 'string' ? null : product.category;

            return (
              <TableRow key={product.id} className={cn(!product.isActive && 'opacity-60')}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(product.id)}
                    onCheckedChange={() => toggleOne(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-white">
                      <Image
                        src={product.images[0]?.url ?? '/placeholders/default.svg'}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-contain"
                      />
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="line-clamp-1 text-sm font-medium text-brand-navy hover:text-brand-cyan"
                      >
                        {product.name}
                      </Link>
                      <span className="block font-mono text-2xs text-muted-foreground">{product.sku}</span>
                    </span>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell text-sm">{brand?.name ?? '—'}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{category?.name ?? '—'}</TableCell>

                <TableCell>
                  <Badge variant={MODE_VARIANT[product.pricingMode]}>{product.pricingMode}</Badge>
                </TableCell>

                <TableCell className="text-right text-sm tabular-nums">
                  {typeof product.price === 'number' ? formatPKR(product.price) : '—'}
                </TableCell>

                <TableCell className="text-center">
                  <span className={cn('text-sm font-semibold tabular-nums', stockTone(product))}>
                    {product.stock}
                  </span>
                  <span className="mt-0.5 block">
                    <StockBadge status={product.stockStatus} />
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={() => toggleActive(product)}
                    aria-label={`${product.isActive ? 'Deactivate' : 'Activate'} ${product.name}`}
                  />
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${product.name}`}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-navy/5 hover:text-brand-navy"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Pencil />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.slug}`} target="_blank">
                          <Upload />
                          View on site
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(product.sku);
                          toast.success('SKU copied');
                        }}
                      >
                        <Copy />
                        Copy SKU
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setPendingDelete(product)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Deactivate this product?"
        description={`"${pendingDelete?.name ?? ''}" will be hidden from the storefront. Order history and links keep working — this is a soft delete, not a permanent one.`}
        confirmLabel="Deactivate"
        destructive
        isLoading={mutations.remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          mutations.remove.mutate(pendingDelete.id, {
            onSuccess: () => toast.success('Product deactivated'),
            onError: (error) => toast.error('Could not deactivate', { description: error.message }),
          });
          setPendingDelete(null);
        }}
      />
    </>
  );
}

export { Download };
```

## `client/src/components/admin/orders/order-actions.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Mail, Printer, Save, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/admin/primitives';
import { useOrderMutations } from '@/lib/api/admin';
import { env } from '@/lib/env';
import type { OrderResponse } from '@/lib/api/cart.types';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] as const;

/** Status changer, dispatch, payment and document actions for one order. */
export function OrderActions({ order }: { order: OrderResponse }): JSX.Element {
  const mutations = useOrderMutations(order.id);

  const [status, setStatus] = useState(order.orderStatus);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const [confirming, setConfirming] = useState(false);

  const destructive = status === 'cancelled' || status === 'returned';
  const invoiceHref = `${env.NEXT_PUBLIC_API_URL}/admin/orders/${order.id}/invoice`;

  const applyStatus = (): void => {
    mutations.status.mutate(
      { status, note: note || undefined, notifyCustomer: notify },
      {
        onSuccess: () => {
          setNote('');
          toast.success(`Order is now ${status}`, {
            description: notify ? 'The customer has been emailed.' : 'No email sent.',
          });
        },
        onError: (error) => toast.error('Could not update status', { description: error.message }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Change status
        </h2>

        <div className="mt-3 space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Order status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note — appears in the order history and the customer's email."
            aria-label="Status note"
            rows={2}
          />

          <div className="flex items-center gap-2.5">
            <Checkbox id="notify" checked={notify} onCheckedChange={(checked) => setNotify(checked === true)} />
            <Label htmlFor="notify" className="font-normal">Email the customer about this change</Label>
          </div>

          {destructive ? (
            <Alert variant="warning" className="text-xs">
              Moving to <strong>{status}</strong> returns reserved stock to inventory. This only fires
              on the transition, so it cannot double-count.
            </Alert>
          ) : null}

          <Button
            variant={destructive ? 'danger' : 'cta'}
            block
            disabled={status === order.orderStatus}
            isLoading={mutations.status.isPending}
            onClick={() => (destructive ? setConfirming(true) : applyStatus())}
          >
            <Save />
            {status === order.orderStatus ? 'No change to apply' : `Mark as ${status}`}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Dispatch</h2>
        <div className="mt-3 space-y-3">
          <Field label="Courier" htmlFor="courier">
            <Input id="courier" value={courier} onChange={(event) => setCourier(event.target.value)} placeholder="TCS, Leopards, M&P…" />
          </Field>
          <Field label="Tracking number" htmlFor="tracking">
            <Input id="tracking" value={tracking} onChange={(event) => setTracking(event.target.value)} className="font-mono" />
          </Field>
          <Button
            variant="outline"
            block
            isLoading={mutations.tracking.isPending}
            onClick={() =>
              mutations.tracking.mutate(
                { courier, trackingNumber: tracking, markShipped: order.orderStatus !== 'shipped' },
                {
                  onSuccess: () => toast.success('Tracking saved and customer notified'),
                  onError: (error) => toast.error('Could not save', { description: error.message }),
                },
              )
            }
          >
            <Truck />
            Save tracking{order.orderStatus !== 'shipped' ? ' & mark shipped' : ''}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Payment</h2>
        <div className="mt-3 space-y-2">
          {(['paid', 'pending', 'failed', 'refunded'] as const).map((value) => (
            <Button
              key={value}
              variant={order.paymentStatus === value ? 'primary' : 'outline'}
              size="sm"
              block
              disabled={order.paymentStatus === value}
              onClick={() =>
                mutations.payment.mutate(
                  { paymentStatus: value },
                  {
                    onSuccess: () => toast.success(`Payment marked ${value}`),
                    onError: (error) => toast.error('Could not update', { description: error.message }),
                  },
                )
              }
            >
              Mark {value}
            </Button>
          ))}
          <p className="pt-1 text-2xs text-muted-foreground">
            Marking a pending order as paid also confirms it.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Documents</h2>
        <div className="mt-3 space-y-2">
          <Button asChild variant="outline" size="sm" block>
            <a href={invoiceHref} target="_blank" rel="noopener noreferrer">
              <Printer />
              Print invoice (PDF)
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" block>
            <a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Your Fast Traders order ${order.orderNumber}`)}`}>
              <Mail />
              Email the customer
            </a>
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Mark this order ${status}?`}
        description="Reserved stock will be returned to inventory, and the customer notified if the email option is ticked."
        confirmLabel={`Yes, mark ${status}`}
        destructive
        isLoading={mutations.status.isPending}
        onConfirm={applyStatus}
      />
    </div>
  );
}
```

## `client/src/app/admin/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  FileText,
  Package,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/feedback';
import { PageHeader, StatCard } from '@/components/admin/primitives';
import { OrdersDonut, RevenueChart, TotalsBarChart } from '@/components/admin/dashboard/charts';
import { RecentActivity } from '@/components/admin/dashboard/recent';
import { useAdminCharts, useAdminRecent, useAdminStats } from '@/lib/api/admin';
import { formatPKR } from '@/lib/utils';

const RANGES = [
  { label: 'Last 7 days', days: 7, granularity: 'daily' as const },
  { label: 'Last 30 days', days: 30, granularity: 'daily' as const },
  { label: 'Last 90 days', days: 90, granularity: 'weekly' as const },
  { label: 'Last 12 months', days: 365, granularity: 'monthly' as const },
];

/**
 * Admin dashboard.
 *
 * Period-over-period change is derived client-side from the cumulative figures
 * the API returns — today vs. the daily average of the month, month vs. the
 * monthly average of the year. It is an indicative trend, and the tooltip on
 * each card says so rather than implying an exact comparison.
 */
export default function AdminDashboardPage(): JSX.Element {
  const [rangeIndex, setRangeIndex] = useState(1);
  const range = RANGES[rangeIndex] ?? RANGES[1];

  const { data: stats, isPending } = useAdminStats();
  const { data: charts, isFetching } = useAdminCharts(range?.granularity ?? 'daily', range?.days ?? 30);
  const { data: recent } = useAdminRecent();

  /** Percentage difference between a period and a baseline average. */
  const change = (current: number, baselineTotal: number, periods: number): number | undefined => {
    if (periods <= 0) return undefined;
    const baseline = baselineTotal / periods;
    if (baseline === 0) return current > 0 ? 100 : 0;
    return ((current - baseline) / baseline) * 100;
  };

  const today = new Date().getDate();
  const month = new Date().getMonth() + 1;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Revenue, orders and everything waiting on you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports">View reports</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Revenue today"
          value={formatPKR(stats?.revenue.today.revenue ?? 0)}
          change={stats ? change(stats.revenue.today.revenue, stats.revenue.month.revenue, today) : undefined}
          Icon={Banknote}
          loading={isPending}
        />
        <StatCard
          label="Revenue this month"
          value={formatPKR(stats?.revenue.month.revenue ?? 0)}
          change={stats ? change(stats.revenue.month.revenue, stats.revenue.year.revenue, month) : undefined}
          Icon={TrendingUp}
          loading={isPending}
        />
        <StatCard
          label="Orders this month"
          value={stats?.revenue.month.orders ?? 0}
          hint={`${stats?.revenue.today.orders ?? 0} today`}
          Icon={Package}
          loading={isPending}
        />
        <StatCard
          label="Pending quotations"
          value={stats?.quotations.new ?? 0}
          hint={`${stats?.quotations.awaitingResponse ?? 0} awaiting customer reply`}
          Icon={FileText}
          loading={isPending}
        />
        <StatCard
          label="Low stock"
          value={stats?.inventory.lowStock ?? 0}
          hint={`${stats?.inventory.outOfStock ?? 0} out of stock`}
          Icon={AlertTriangle}
          invertChange
          loading={isPending}
        />
        <StatCard
          label="Average order value"
          value={formatPKR(stats?.averageOrderValue ?? 0)}
          hint={`${stats?.customers.newThisMonth ?? 0} new customers this month`}
          Icon={UserPlus}
          loading={isPending}
        />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Revenue over time
          </h2>
          <Select value={String(rangeIndex)} onValueChange={(value) => setRangeIndex(Number(value))}>
            <SelectTrigger className="h-9 w-[170px]" aria-label="Chart date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option, index) => (
                <SelectItem key={option.label} value={String(index)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFetching && !charts ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <RevenueChart data={charts?.salesOverTime ?? []} />
        )}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Orders by status">
          <OrdersDonut data={stats?.ordersByStatus ?? {}} />
        </ChartCard>
        <ChartCard title="Top products by revenue">
          <TotalsBarChart data={charts?.topProducts ?? []} />
        </ChartCard>
        <ChartCard title="Revenue by brand">
          <TotalsBarChart data={charts?.revenueByBrand ?? []} colour="#00AEEF" />
        </ChartCard>
        <ChartCard title="Revenue by category">
          <TotalsBarChart data={charts?.revenueByCategory ?? []} colour="#3F51A8" />
        </ChartCard>
      </div>

      {stats && stats.inventory.lowStock + stats.inventory.outOfStock > 0 ? (
        <section className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-5">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Stock needs attention
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <Badge variant="warning">{stats.inventory.lowStock}</Badge> at or below their low-stock
            threshold and <Badge variant="danger">{stats.inventory.outOfStock}</Badge> out of stock,
            across {stats.inventory.totalActive} active products.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products?lowStock=true">Review low stock</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/products?outOfStock=true">Out of stock</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <RecentActivity data={recent} />
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        {title}
      </h2>
      {children}
    </section>
  );
}
```

## `client/src/app/admin/products/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Plus, Search, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { ProductTable } from '@/components/admin/products/product-table';
import { useAdminProducts, useProductMutations, useTaxonomy, type AdminQuery } from '@/lib/api/admin';
import { useDebounce } from '@/hooks/use-debounce';
import { env } from '@/lib/env';

/** Product listing with search, filters, bulk actions and CSV/XLSX transfer. */
export default function AdminProductsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminQuery>({ sort: 'newest' });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const debounced = useDebounce(search, 300);
  const brands = useTaxonomy('brands');
  const mutations = useProductMutations();

  const query: AdminQuery = {
    ...filters,
    page,
    limit: 20,
    ...(debounced.length >= 2 ? { search: debounced } : {}),
  };
  const { data, isPending } = useAdminProducts(query);

  const setFilter = (key: string, value: string | undefined): void => {
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined || value === 'all') delete next[key];
      else next[key] = value;
      return next;
    });
    setPage(1);
  };

  const activeFilters = Object.keys(filters).filter((key) => key !== 'sort').length;

  const runBulk = (action: string): void => {
    mutations.bulk.mutate(
      { ids: selected, action },
      {
        onSuccess: (result) => {
          toast.success(`${result.modified} product(s) updated`);
          setSelected([]);
        },
        onError: (error) => toast.error('Bulk action failed', { description: error.message }),
      },
    );
  };

  /** Export streams from the API, so link straight at it with the filters applied. */
  const exportHref = `${env.NEXT_PUBLIC_API_URL}/admin/products/export?format=xlsx${
    filters.isActive ? `&isActive=${String(filters.isActive)}` : ''
  }`;

  return (
    <>
      <PageHeader
        title="Products"
        description={data ? `${data.meta.total} products in the catalogue` : 'Loading…'}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Download />
                Export
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products/import">
                <Upload />
                Import CSV
              </Link>
            </Button>
            <Button asChild variant="cta" size="sm">
              <Link href="/admin/products/new">
                <Plus />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-3">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search name, SKU or part number…"
          aria-label="Search products"
          leadingIcon={<Search />}
          className="h-9 w-full sm:w-72"
        />

        <Select value={String(filters.brand ?? 'all')} onValueChange={(value) => setFilter('brand', value)}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by brand">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {(brands.data ?? []).map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.pricingMode ?? 'all')}
          onValueChange={(value) => setFilter('pricingMode', value)}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by pricing mode">
            <SelectValue placeholder="Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pricing</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="quote">Quote only</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.isActive ?? 'all')} onValueChange={(value) => setFilter('isActive', value)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.lowStock ?? 'all')} onValueChange={(value) => setFilter('lowStock', value)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by stock">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any stock</SelectItem>
            <SelectItem value="true">Low stock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.sort ?? 'newest')} onValueChange={(value) => setFilter('sort', value)}>
          <SelectTrigger className="h-9 w-[150px]" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            <SelectItem value="price_desc">Price high–low</SelectItem>
            <SelectItem value="stock_asc">Stock low–high</SelectItem>
            <SelectItem value="sales">Best selling</SelectItem>
          </SelectContent>
        </Select>

        {activeFilters > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ sort: 'newest' }); setPage(1); }}>
            <X />
            Clear ({activeFilters})
          </Button>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 p-3">
          <Badge variant="accent">{selected.length} selected</Badge>
          {[
            { action: 'activate', label: 'Activate' },
            { action: 'deactivate', label: 'Deactivate' },
            { action: 'feature', label: 'Feature' },
            { action: 'unfeature', label: 'Unfeature' },
          ].map((item) => (
            <Button key={item.action} variant="outline" size="sm" onClick={() => runBulk(item.action)}>
              {item.label}
            </Button>
          ))}
          <Button variant="danger" size="sm" onClick={() => setBulkAction('delete')}>
            Deactivate &amp; hide
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <ProductTable
        products={data?.items ?? []}
        isLoading={isPending}
        selected={selected}
        onSelectedChange={setSelected}
      />

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && setBulkAction(null)}
        title={`Deactivate ${selected.length} product(s)?`}
        description="They will be hidden from the storefront. This is a soft delete — order history and existing links keep working."
        confirmLabel="Deactivate all"
        destructive
        isLoading={mutations.bulk.isPending}
        onConfirm={() => {
          runBulk('delete');
          setBulkAction(null);
        }}
      />
    </>
  );
}
```

## `client/src/app/admin/products/new/page.tsx`

```tsx
'use client';

import { PageHeader } from '@/components/admin/primitives';
import { ProductForm } from '@/components/admin/products/product-form';

export default function NewProductPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Add product"
        description="Create the record first, then upload images and datasheets against it."
      />
      <ProductForm />
    </>
  );
}
```

## `client/src/app/admin/products/[id]/edit/page.tsx`

```tsx
'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/feedback';
import { ErrorState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { ProductForm } from '@/components/admin/products/product-form';
import { useAdminProduct } from '@/lib/api/admin';

export default function EditProductPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { data: product, isPending, isError, refetch } = useAdminProduct(params.id);

  if (isPending) {
    return (
      <>
        <PageHeader title="Edit product" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (isError || !product) {
    return <ErrorState title="Product not found" onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title={product.name} description={`SKU ${product.sku}`} />
      <ProductForm product={product} />
    </>
  );
}
```

## `client/src/app/admin/orders/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminOrders, type AdminQuery } from '@/lib/api/admin';
import { useDebounce } from '@/hooks/use-debounce';
import { env } from '@/lib/env';
import { cn, formatDate, formatPKR } from '@/lib/utils';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'accent'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'accent',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'muted',
};

export default function AdminOrdersPage(): JSX.Element {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debounced = useDebounce(search, 300);
  const query: AdminQuery = {
    page,
    limit: 20,
    sort: 'newest',
    ...(status !== 'all' ? { status } : {}),
    ...(debounced.length >= 2 ? { search: debounced } : {}),
  };
  const { data, isPending } = useAdminOrders(query);

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          data
            ? `${data.meta.total} orders · ${formatPKR(data.filteredRevenue ?? 0)} in this view`
            : 'Loading…'
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`${env.NEXT_PUBLIC_API_URL}/admin/orders/export?format=xlsx`}>
              <Download />
              Export
            </a>
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              aria-pressed={status === tab.value}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                status === tab.value
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-border bg-white text-brand-navy hover:border-brand-navy',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search order number, customer, phone or tracking…"
          aria-label="Search orders"
          leadingIcon={<Search />}
          className="h-9 max-w-md"
        />
      </div>

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No orders in this view"
          description="Try a different status tab, or clear the search."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Placed</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm font-semibold text-brand-navy hover:text-brand-cyan"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-2xs text-muted-foreground">
                      {order.items.length} line{order.items.length === 1 ? '' : 's'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{order.customer.name}</span>
                    <span className="block text-2xs text-muted-foreground">{order.customer.phone}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'muted'}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[order.orderStatus] ?? 'muted'}>
                      {order.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatPKR(order.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.meta.totalPages > 1 ? (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          ) : null}
        </>
      )}
    </>
  );
}
```

## `client/src/app/admin/orders/[id]/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { OrderDetail } from '@/components/order/order-detail';
import { OrderActions } from '@/components/admin/orders/order-actions';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminOrder } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils';

/**
 * Admin order detail.
 *
 * Reuses the customer-facing `OrderDetail` for the read-only half — one
 * presentation of an order means the admin and the customer can never be
 * looking at different numbers — with the admin action rail beside it.
 */
export default function AdminOrderPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { data: order, isPending, isError, refetch } = useAdminOrder(params.id);

  if (isPending) {
    return (
      <>
        <PageHeader title="Order" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (isError || !order) {
    return <ErrorState title="Order not found" onRetry={() => void refetch()} />;
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/admin/orders">
          <ArrowLeft />
          All orders
        </Link>
      </Button>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDate(order.createdAt)} by ${order.customer.name}`}
        actions={
          <>
            <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'muted'}>
              {order.paymentStatus}
            </Badge>
            <Badge variant="default">{order.orderStatus}</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <OrderDetail order={order} />
        <OrderActions order={order} />
      </div>
    </>
  );
}
```
