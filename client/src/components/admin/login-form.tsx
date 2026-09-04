'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { apiClient, isApiClientError } from '@/lib/api-client';
import { loginSchema, type LoginInput } from '@/lib/forms';

/**
 * Staff sign-in form.
 *
 * The API sets httpOnly access and refresh cookies, so there is no token to
 * hold here. On success we do a hard `router.replace` + `refresh` rather than
 * a client-side push: middleware reads the cookie on the *server*, and a soft
 * navigation would race it.
 */
export function StaffLoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await apiClient.post('/auth/login', values);
      // Only ever return inside /admin — `next` comes from the query string.
      const target = next && next.startsWith('/admin') ? next : '/admin';
      router.replace(target);
      router.refresh();
    } catch (error) {
      const message = isApiClientError(error)
        ? error.message
        : 'Could not reach the server. Check your connection and try again.';
      setError('root', { message });
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      {errors.root ? <Alert variant="danger">{errors.root.message}</Alert> : null}

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="you@fasttraders.co"
          {...register('email')}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
      </Field>

      <Button type="submit" variant="cta" block isLoading={isSubmitting} loadingText="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
