import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/logo';

/** Centred card used by all four auth screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-lg border border-border bg-white p-7 shadow-card">
          <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>

          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-2xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-brand-cyan" aria-hidden />
          Your session is protected with httpOnly cookies.{' '}
          <Link href="/privacy-policy" className="underline hover:text-brand-cyan">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
