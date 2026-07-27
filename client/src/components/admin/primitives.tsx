'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';

/** Small building blocks shared across the admin screens. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * KPI tile.
 *
 * `change` is a percentage against the previous equivalent period. Direction
 * is colour-coded, but for a metric like "out of stock" a rise is bad, so
 * `invertChange` flips the colour without flipping the arrow.
 */
export function StatCard({
  label,
  value,
  change,
  hint,
  Icon,
  invertChange,
  loading,
}: {
  label: string;
  value: string | number;
  change?: number;
  hint?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  invertChange?: boolean;
  loading?: boolean;
}): JSX.Element {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    );
  }

  const rising = typeof change === 'number' && change > 0;
  const flat = typeof change === 'number' && change === 0;
  const good = invertChange ? !rising : rising;

  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-brand-cyan" /> : null}
      </div>

      <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-brand-navy">{value}</p>

      {typeof change === 'number' ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
            flat ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive',
          )}
        >
          {flat ? (
            <Minus className="size-3" aria-hidden />
          ) : rising ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )}
          {Math.abs(change).toFixed(1)}%
          <span className="font-normal text-muted-foreground">vs previous period</span>
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Confirmation dialog for anything destructive. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  isLoading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'cta'}
            isLoading={isLoading}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
