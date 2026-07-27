import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/auth-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Create an account',
  description: 'Create a Fast Traders account to track orders and request trade pricing.',
  path: '/register',
  noIndex: true,
});

export default function RegisterPage(): JSX.Element {
  return (
    <AuthShell
      title="Create an account"
      description="Faster checkout, saved addresses, and your quotation history in one place."
      footer={
        <>
          Already registered?{' '}
          <Link href="/login" className="font-medium text-brand-cyan hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
