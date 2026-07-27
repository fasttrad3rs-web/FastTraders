'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { apiClient, unwrap } from '@/lib/api-client';
import { loginSchema, registerSchema } from '@/lib/forms';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/types';

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

interface AuthResponse {
  user: User;
  accessToken: string;
}

/** Password field with a show/hide toggle. */
function PasswordInput({
  id,
  registration,
  hasError,
  autoComplete,
}: {
  id: string;
  registration: ReturnType<typeof useForm<never>>['register'] extends never ? never : object;
  hasError?: boolean;
  autoComplete?: string;
}): JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      id={id}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      hasError={hasError}
      trailingIcon={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="text-muted-foreground transition-colors hover:text-brand-navy"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...registration}
    />
  );
}

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const data = unwrap(await apiClient.post<AuthResponse>('/auth/login', values));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      router.push(searchParams.get('next') ?? '/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign you in.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field label="Email" htmlFor="login-email" required error={errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          {...register('email')}
          hasError={Boolean(errors.email)}
        />
      </Field>

      <Field label="Password" htmlFor="login-password" required error={errors.password?.message}>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          hasError={Boolean(errors.password)}
          registration={register('password')}
        />
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-medium text-brand-cyan hover:underline">
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Signing in…">
        <LogIn />
        Sign in
      </Button>
    </form>
  );
}

export function RegisterForm(): JSX.Element {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const data = unwrap(await apiClient.post<AuthResponse>('/auth/register', values));
      setUser(data.user);
      toast.success('Account created', { description: 'Check your email to verify your address.' });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create your account.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Field label="Full name" htmlFor="reg-name" required error={errors.name?.message}>
        <Input id="reg-name" autoComplete="name" {...register('name')} hasError={Boolean(errors.name)} />
      </Field>

      <Field label="Company" htmlFor="reg-company" hint="Optional — helps us apply trade pricing.">
        <Input id="reg-company" autoComplete="organization" {...register('companyName')} />
      </Field>

      <Field label="Email" htmlFor="reg-email" required error={errors.email?.message}>
        <Input id="reg-email" type="email" autoComplete="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Field label="Phone / WhatsApp" htmlFor="reg-phone" required error={errors.phone?.message}>
        <Input id="reg-phone" type="tel" autoComplete="tel" placeholder="0300 1234567" {...register('phone')} hasError={Boolean(errors.phone)} />
      </Field>

      <Field
        label="Password"
        htmlFor="reg-password"
        required
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
      >
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          hasError={Boolean(errors.password)}
          registration={register('password')}
        />
      </Field>

      <Button type="submit" variant="cta" size="lg" block isLoading={isSubmitting} loadingText="Creating…">
        <UserPlus />
        Create account
      </Button>
    </form>
  );
}
