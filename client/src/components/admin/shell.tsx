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
