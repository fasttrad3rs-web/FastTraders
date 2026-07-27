import * as React from 'react';
import { Loader2, PackageSearch, RefreshCw, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Loading, empty and error states — the three screens users actually hit. */

export function Spinner({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}): JSX.Element {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={cn('size-5 animate-spin text-brand-cyan', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Skeleton block. The shimmer is a translated highlight rather than a pulsing
 * opacity — it reads as "loading" even on a cheap 60 Hz Android screen.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      aria-hidden
      className={cn('relative overflow-hidden rounded-md bg-brand-navy/[0.07]', className)}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/** Product-card skeleton, matching the real card's proportions. */
export function ProductCardSkeleton(): JSX.Element {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-white p-4">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        // eslint-disable-next-line react/no-array-index-key -- purely decorative
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy [&_svg]:size-6">
        {icon ?? <PackageSearch />}
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-bold text-brand-navy">{title}</p>
        {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this just now. Please try again, or call us on +92 324 4234990.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}): JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive [&_svg]:size-6">
        <ServerCrash />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-bold text-brand-navy">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
