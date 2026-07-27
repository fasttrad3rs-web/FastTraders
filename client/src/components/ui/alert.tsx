import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Inline message block. Toasts are transient; alerts stay on the page. */
const alertVariants = cva('relative flex w-full gap-3 rounded-lg border p-4 text-sm', {
  variants: {
    variant: {
      info: 'border-brand-cyan/30 bg-brand-cyan/5 text-brand-navy',
      success: 'border-success/30 bg-success/5 text-foreground',
      warning: 'border-warning/40 bg-warning/10 text-foreground',
      danger: 'border-destructive/30 bg-destructive/5 text-foreground',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const ICON_COLOURS = {
  info: 'text-brand-cyan',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

function Alert({ className, variant = 'info', title, children, ...props }: AlertProps): JSX.Element {
  const key = variant ?? 'info';
  const Icon = ICONS[key];

  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_COLOURS[key])} aria-hidden />
      <div className="space-y-1">
        {title ? <p className="font-semibold leading-none">{title}</p> : null}
        {children ? <div className="text-muted-foreground [&_a]:text-brand-cyan [&_a]:underline">{children}</div> : null}
      </div>
    </div>
  );
}

export { Alert, alertVariants };
