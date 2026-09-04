'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { useAdminStats } from '@/lib/api/admin';
import { AdminSidebar } from './sidebar';
import { AdminTopbar } from './topbar';

/**
 * Admin chrome: fixed sidebar on desktop, drawer on tablet and below.
 *
 * Responsive down to tablet as specified — below `lg` the sidebar becomes a
 * sheet so the content column keeps its full width for data tables.
 *
 * `/admin/login` renders bare. It lives inside this route group so the whole
 * staff area sits under one path, but wrapping a sign-in page in a sidebar
 * full of links that all 401 would be absurd.
 */
export function AdminShell({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  const bare = pathname === '/admin/login';

  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Skipped on the sign-in page: the request would 401 and the retry would
  // fire on every keystroke-triggered re-render.
  const { data: stats } = useAdminStats({ enabled: !bare });

  const pending = stats
    ? {
        testimonials: stats.pending.testimonials,
        contacts: stats.pending.contacts,
        // `byStatus` is keyed by the inquiry status enum; absent means zero.
        inquiries: stats.byStatus.new ?? 0,
      }
    : undefined;

  if (bare) return <>{children}</>;

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
