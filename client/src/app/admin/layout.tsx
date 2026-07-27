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
