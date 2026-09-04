import { Suspense } from 'react';
import type { Metadata } from 'next';
import { StaffLoginForm } from '@/components/admin/login-form';
import { Logo } from '@/components/layout/logo';
import { CONTACT, SITE } from '@/lib/constants';

/**
 * Staff sign-in.
 *
 * This lives under `/admin` rather than at `/login` because there are no
 * customer accounts any more — the only people who sign in are Sharjeel and
 * his staff. Middleware sends unauthenticated admin traffic here.
 */
export const metadata: Metadata = {
  title: `Staff sign in — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function AdminLoginPage(): JSX.Element {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-dark px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* The card sits on brand-dark, so the reversed lockup. */}
          <Logo variant="light" lockup="stacked" height={96} href={null} showStrapline={false} />
          <p className="text-2xs uppercase tracking-[0.18em] text-white/50">Staff area</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-panel">
          <h1 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
            Sign in
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Staff accounts only. There is no public sign-up.
          </p>

          {/*
            `useSearchParams` inside the form (it reads `?next=`) opts the whole
            page into client-side rendering unless it sits behind a Suspense
            boundary — prerendering fails outright without one. The fallback is
            a static skeleton of the same height so the card does not jump.
          */}
          <Suspense
            fallback={
              <div className="space-y-4" aria-hidden>
                <div className="h-10 rounded-lg bg-surface" />
                <div className="h-10 rounded-lg bg-surface" />
                <div className="h-10 rounded-lg bg-brand-navy/20" />
              </div>
            }
          >
            <StaffLoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-2xs text-white/50">
          Locked out? Call the shop on {CONTACT.landline}.
        </p>
      </div>
    </main>
  );
}
