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
  ScrollText,
  Settings,
  Star,
  Tags,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';

/**
 * Admin sidebar — dark navy, collapsible to an icon rail.
 *
 * Grouped rather than one flat list: Sharjeel's daily path is Orders and
 * Quotations, and burying those in a 15-item list would cost him time.
 */

const GROUPS: { label: string; items: { href: string; label: string; Icon: typeof Boxes }[] }[] = [
  {
    label: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/admin/inquiries', label: 'Inquiries', Icon: FileText },
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
      { href: '/admin/newsletter', label: 'Newsletter', Icon: Mail },
      { href: '/admin/testimonials', label: 'Testimonials', Icon: Star },
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
        {/* Collapsed rail has room for the mark only. */}
        <Logo
          href="/admin"
          variant="light"
          lockup={collapsed ? 'mark' : 'horizontal'}
          height={collapsed ? 30 : 26}
          showStrapline={false}
        />
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
