'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/feedback';

/**
 * Error boundary for the admin area.
 *
 * The storefront boundary answers a customer, so it offers a phone number and
 * a way back to browsing. This one answers Sharjeel or a staff member who is
 * mid-task, so it says something different: what broke, and that nothing they
 * typed was sent.
 *
 * `digest` is shown deliberately. It is the only handle a developer has on a
 * production error, and "it broke" down the phone is not debuggable — a staff
 * member reading out eight characters is.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error('[admin error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <ErrorState
        title="This screen could not be loaded"
        description="Nothing you entered has been saved. Try again — if it keeps happening, the reference below will help us find the cause."
        onRetry={reset}
        className="w-full max-w-xl"
      />

      {error.digest ? (
        <p className="mt-4 font-mono text-2xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/inquiries">Go to inquiries</Link>
        </Button>
      </div>
    </div>
  );
}
