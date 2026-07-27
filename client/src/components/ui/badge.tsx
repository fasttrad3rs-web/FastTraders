import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Status pill. Stock and pricing-mode states get dedicated variants. */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-navy text-white',
        accent: 'border-transparent bg-brand-cyan text-white',
        outline: 'border-brand-navy/25 bg-white text-brand-navy',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        danger: 'border-transparent bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Removable filter token used above the catalogue grid. */
function Chip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove?: () => void;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-white py-1 pl-3 pr-1.5 text-xs font-medium text-brand-navy',
        !onRemove && 'pr-3',
        className,
      )}
    >
      {label}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove filter ${label}`}
          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-brand-navy/10 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

/** Stock badge with the wording the counter staff actually use. */
function StockBadge({ status }: { status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order' }): JSX.Element {
  const map = {
    in_stock: { label: 'In stock', variant: 'success' as const },
    low_stock: { label: 'Low stock', variant: 'warning' as const },
    out_of_stock: { label: 'Out of stock', variant: 'muted' as const },
    on_order: { label: 'On order', variant: 'outline' as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export { Badge, badgeVariants, Chip, StockBadge };
