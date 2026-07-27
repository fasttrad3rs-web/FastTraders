import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/password-forms';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Set a new password',
  description: 'Choose a new password for your Fast Traders account.',
  path: '/reset-password',
  noIndex: true,
});

export default function ResetPasswordPage({ params }: { params: { token: string } }): JSX.Element {
  return (
    <AuthShell title="Set a new password" description="Choose something you have not used here before.">
      <ResetPasswordForm token={params.token} />
    </AuthShell>
  );
}
