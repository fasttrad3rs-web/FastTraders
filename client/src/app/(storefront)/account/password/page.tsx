'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { useChangePassword } from '@/lib/api/account';
import { changePasswordSchema } from '@/lib/forms';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage(): JSX.Element {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success('Password changed', { description: 'Other devices have been signed out.' });
    } catch (error) {
      toast.error('Could not change your password', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Change Password
      </h1>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-5 max-w-md space-y-4 rounded-lg border border-border bg-white p-6"
      >
        <Field label="Current password" htmlFor="cp-current" required error={errors.currentPassword?.message}>
          <Input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
            hasError={Boolean(errors.currentPassword)}
          />
        </Field>

        <Field
          label="New password"
          htmlFor="cp-new"
          required
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
        >
          <Input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            hasError={Boolean(errors.newPassword)}
          />
        </Field>

        <Field label="Confirm new password" htmlFor="cp-confirm" required error={errors.confirm?.message}>
          <Input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
            hasError={Boolean(errors.confirm)}
          />
        </Field>

        <Alert variant="info" className="text-xs">
          Changing your password signs out every other device.
        </Alert>

        <Button type="submit" variant="cta" isLoading={isSubmitting} loadingText="Saving…">
          <KeyRound />
          Change password
        </Button>
      </form>
    </div>
  );
}
