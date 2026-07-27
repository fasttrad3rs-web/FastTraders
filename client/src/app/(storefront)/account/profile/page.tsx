'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { BadgeCheck, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { useUpdateProfile } from '@/lib/api/account';
import { useAuth } from '@/lib/auth-context';
import { profileSchema } from '@/lib/forms';

type ProfileInput = z.infer<typeof profileSchema>;

export default function ProfilePage(): JSX.Element {
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      companyName: user?.companyName ?? '',
      ntn: user?.ntn ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync({
        name: values.name,
        phone: values.phone,
        companyName: values.companyName || null,
        ntn: values.ntn || null,
      });
      setUser(updated);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Could not save', { description: error instanceof Error ? error.message : undefined });
    }
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Profile
      </h1>

      {user && !user.isEmailVerified ? (
        <Alert variant="warning" title="Email not verified" className="mt-4">
          Check your inbox for the verification link so we can send you order updates.
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4 rounded-lg border border-border bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pr-name" required error={errors.name?.message}>
            <Input id="pr-name" {...register('name')} hasError={Boolean(errors.name)} />
          </Field>

          <Field label="Phone / WhatsApp" htmlFor="pr-phone" required error={errors.phone?.message}>
            <Input id="pr-phone" type="tel" {...register('phone')} hasError={Boolean(errors.phone)} />
          </Field>

          <Field label="Company" htmlFor="pr-company">
            <Input id="pr-company" {...register('companyName')} />
          </Field>

          <Field
            label="NTN / CNIC"
            htmlFor="pr-ntn"
            hint="For tax invoices on business purchases."
            error={errors.ntn?.message}
          >
            <Input id="pr-ntn" {...register('ntn')} hasError={Boolean(errors.ntn)} />
          </Field>
        </div>

        <div className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <BadgeCheck className="size-3.5 text-brand-cyan" aria-hidden />
            Email: <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <p className="mt-1">
            To change your email address, contact us on +92 324 4234990 — we verify it manually to
            protect your order history.
          </p>
        </div>

        <Button type="submit" variant="cta" isLoading={isSubmitting} disabled={!isDirty}>
          <Save />
          Save changes
        </Button>
      </form>
    </div>
  );
}
