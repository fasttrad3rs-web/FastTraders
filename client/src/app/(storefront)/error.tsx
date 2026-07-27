'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Route error boundary.
 * The customer gets a phone number, not a stack trace — for this business a
 * broken page should still convert into a call.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // Replaced with the real reporter (Sentry or similar) at deploy time.
    console.error('[route error]', error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16">
      <ErrorState
        title="This page could not be loaded"
        description="Something went wrong at our end. Try again, or call us on +92 324 4234990 and we will help straight away."
        onRetry={reset}
        className="w-full max-w-xl"
      />

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="cta">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>

      {error.digest ? (
        <p className="mt-6 text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
