'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/forms';

type ForgotInput = z.infer<typeof forgotPasswordSchema>;
type ResetInput = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm(): JSX.Element {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    // The API always answers 200 so an attacker cannot enumerate accounts;
    // the UI mirrors that and never confirms whether the address exists.
    await apiClient.post('/auth/forgot-password', values).catch(() => undefined);
    setSent(true);
  });

  if (sent) {
    return (
      <Alert variant="success" title="Check your email">
        If that address is registered, a reset link is on its way. The link is valid for 30
        minutes and can only be used once.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="fp-email" required error={errors.email?.message}>
        <Input id="fp-email" type="email" autoComplete="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Sending…">
        <Mail />
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiClient.post(`/auth/reset-password/${token}`, { password: values.password });
      toast.success('Password reset', { description: 'You are now signed in.' });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This link is invalid or has expired.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field
        label="New password"
        htmlFor="rp-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
      >
        <Input
          id="rp-password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          hasError={Boolean(errors.password)}
        />
      </Field>

      <Field label="Confirm password" htmlFor="rp-confirm" required error={errors.confirm?.message}>
        <Input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          {...register('confirm')}
          hasError={Boolean(errors.confirm)}
        />
      </Field>

      <Alert variant="info" className="text-xs">
        Resetting your password signs out every other device.
      </Alert>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Saving…">
        <KeyRound />
        Set new password
      </Button>
    </form>
  );
}
