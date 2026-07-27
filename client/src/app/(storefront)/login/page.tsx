import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/auth-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in',
  description: 'Sign in to your Fast Traders account to track orders and quotations.',
  path: '/login',
  noIndex: true,
});

export default function LoginPage(): JSX.Element {
  return (
    <AuthShell
      title="Sign in"
      description="Track orders, review quotations and reuse your saved addresses."
      footer={
        <>
          New to Fast Traders?{' '}
          <Link href="/register" className="font-medium text-brand-cyan hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
