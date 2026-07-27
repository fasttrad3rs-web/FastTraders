import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Forgot your password',
  description: 'Reset the password on your Fast Traders account.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordPage(): JSX.Element {
  return (
    <AuthShell
      title="Forgot your password"
      description="Enter your email and we will send you a link to set a new one."
      footer={
        <Link href="/login" className="font-medium text-brand-cyan hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
