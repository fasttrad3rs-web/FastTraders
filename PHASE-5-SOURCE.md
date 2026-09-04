# Fast Traders — Phase 5 source dump

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

Design system, layout, state and the style guide.
Total files: 58

---

## `client/src/components/ui/alert.tsx`

```tsx
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
```

## `client/src/components/ui/avatar.tsx`

```tsx
'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: 'sm' | 'md' | 'lg' }
>(({ className, size = 'md', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full',
      { sm: 'size-8', md: 'size-10', lg: 'size-14' }[size],
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full object-cover', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center bg-brand-navy text-xs font-bold uppercase text-white',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** Derive initials from a full name, e.g. "Sharjeel Bin Ejaz" -> "SE". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export { Avatar, AvatarImage, AvatarFallback };
```

## `client/src/components/ui/badge.tsx`

```tsx
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
```

## `client/src/components/ui/button.tsx`

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button.
 * `cta` is the conversion variant (cyan with a navy hover) used for
 * Add to Cart, Request Quote and the WhatsApp action.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-navy text-white hover:bg-brand-dark',
        cta: 'bg-brand-cyan text-white hover:bg-brand-navy',
        outline:
          'border border-brand-navy/25 bg-white text-brand-navy hover:border-brand-navy hover:bg-brand-navy/5',
        ghost: 'text-brand-navy hover:bg-brand-navy/5',
        danger: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'text-brand-cyan underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-xs [&_svg]:size-4',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-7 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js `<Link>`). */
  asChild?: boolean;
  isLoading?: boolean;
  /** Replaces the label while loading; keeps the button width stable. */
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, isLoading = false, loadingText, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    // `asChild` forwards a single element, so the spinner is only added on a
    // real <button>. Anything else would break Slot's single-child contract.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, block, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, block, className }))}
        ref={ref}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## `client/src/components/ui/card.tsx`

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

/** Surface container used for product cards, panels and stat tiles. */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-border bg-card text-card-foreground shadow-card',
      interactive && 'transition-shadow hover:shadow-card-hover',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-bold tracking-tight text-brand-navy', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

## `client/src/components/ui/checkbox.tsx`

```tsx
'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Boolean and single-choice controls: Checkbox, RadioGroup, Switch. */

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-[18px] shrink-0 rounded border border-brand-navy/35 bg-white transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-brand-cyan data-[state=checked]:bg-brand-cyan data-[state=checked]:text-white',
      'data-[state=indeterminate]:border-brand-cyan data-[state=indeterminate]:bg-brand-cyan data-[state=indeterminate]:text-white',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === 'indeterminate' ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-2.5', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square size-[18px] rounded-full border border-brand-navy/35 bg-white transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-cyan',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="size-2.5 rounded-full bg-brand-cyan" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-brand-cyan data-[state=unchecked]:bg-brand-navy/20',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Checkbox, RadioGroup, RadioGroupItem, Switch };
```

## `client/src/components/ui/commerce.tsx`

```tsx
'use client';

import * as React from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { cn, formatPKR } from '@/lib/utils';

/** Commerce-specific primitives: rating, quantity stepper, price display. */

export function Rating({
  value,
  count,
  size = 'md',
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}): JSX.Element {
  const starSize = size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            aria-hidden
            className={cn(
              starSize,
              // Half-stars are rounded up visually; the numeric label carries precision.
              star <= Math.round(value) ? 'fill-warning text-warning' : 'fill-transparent text-brand-navy/25',
            )}
          />
        ))}
      </div>
      {count === undefined ? null : (
        <span className="text-xs text-muted-foreground">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
  step = 1,
  unit,
  disabled,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
}): JSX.Element {
  const clamp = (next: number): number => Math.min(max, Math.max(min, next));

  const buttonClass =
    'flex size-9 items-center justify-center text-brand-navy transition-colors hover:bg-brand-navy/5 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan';

  return (
    <div className={cn('inline-flex items-stretch rounded-lg border border-border bg-white', className)}>
      <button
        type="button"
        className={cn(buttonClass, 'rounded-l-lg')}
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled ?? value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        className="w-14 border-x border-border bg-transparent text-center text-sm font-semibold text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={`Quantity${unit ? ` in ${unit}` : ''}`}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
      />

      <button
        type="button"
        className={cn(buttonClass, 'rounded-r-lg')}
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled ?? value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>

      {unit ? (
        <span className="flex items-center pr-3 text-xs font-medium text-muted-foreground">{unit}</span>
      ) : null}
    </div>
  );
}

/**
 * Price display. On `quote`-only products there is no figure to show, so the
 * component renders the call-to-action wording instead of an empty space.
 */
export function PriceDisplay({
  price,
  comparePrice,
  pricingMode,
  size = 'md',
  unit,
  className,
}: {
  price?: number;
  comparePrice?: number;
  pricingMode: 'retail' | 'quote' | 'both';
  size?: 'sm' | 'md' | 'lg';
  unit?: string;
  className?: string;
}): JSX.Element {
  const sizes = {
    sm: { main: 'text-base', old: 'text-xs' },
    md: { main: 'text-xl', old: 'text-sm' },
    lg: { main: 'text-3xl', old: 'text-base' },
  }[size];

  if (pricingMode === 'quote' || typeof price !== 'number') {
    return (
      <span className={cn('font-heading font-bold text-brand-cyan', sizes.main, className)}>
        Price on request
      </span>
    );
  }

  const discount =
    comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-heading font-bold tabular-nums text-brand-navy', sizes.main)}>
        {formatPKR(price)}
      </span>
      {unit ? <span className="text-xs text-muted-foreground">/ {unit}</span> : null}
      {discount > 0 && comparePrice ? (
        <>
          <span className={cn('text-muted-foreground line-through tabular-nums', sizes.old)}>
            {formatPKR(comparePrice)}
          </span>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-2xs font-bold text-destructive">
            −{discount}%
          </span>
        </>
      ) : null}
    </div>
  );
}
```

## `client/src/components/ui/dialog.tsx`

```tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog (centred modal) and Sheet (edge drawer) share one Radix root —
 * the drawer is the mobile presentation of the same primitive.
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-modal bg-brand-dark/55 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-modal grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4',
        'rounded-lg border border-border bg-white p-6 shadow-panel',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    >
      {children}
      {hideClose ? null : (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const SIDES = {
  right: 'inset-y-0 right-0 h-full w-[min(24rem,90vw)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  left: 'inset-y-0 left-0 h-full w-[min(21rem,85vw)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
} as const;

/** Edge drawer: mobile navigation, cart preview, filter panel. */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: keyof typeof SIDES }
>(({ className, children, side = 'right', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-drawer flex flex-col gap-0 border-border bg-white shadow-panel',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-250',
        SIDES[side],
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
        aria-label="Close"
      >
        <X className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col gap-1.5 pr-8 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-heading text-lg font-bold tracking-tight text-brand-navy', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  SheetContent,
};
```

## `client/src/components/ui/feedback.tsx`

```tsx
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
```

## `client/src/components/ui/index.ts`

```ts
/** Barrel for the UI primitives. Keeps page imports to one line. */

export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, Textarea, type InputProps } from './input';
export { Label, Field } from './label';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
} from './select';
export { Checkbox, RadioGroup, RadioGroupItem, Switch } from './checkbox';
export { Slider, PriceRangeSlider } from './slider';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export { Badge, badgeVariants, Chip, StockBadge, type BadgeProps } from './badge';
export { Avatar, AvatarImage, AvatarFallback, initialsOf } from './avatar';
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './tabs';
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './tooltip';
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  SheetContent,
} from './dialog';
export { Alert, alertVariants, type AlertProps } from './alert';
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DataTable,
  type Column,
} from './table';
export { Pagination, Breadcrumb, pageWindow, type Crumb } from './pagination';
export {
  Spinner,
  Skeleton,
  ProductCardSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorState,
} from './feedback';
export { Rating, QuantityStepper, PriceDisplay } from './commerce';
export { Toaster, toast } from './toast';
export { Separator, SectionHeading } from './separator';
```

## `client/src/components/ui/input.tsx`

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the field in an error state and wires up aria-invalid. */
  hasError?: boolean;
  /** Icon rendered inside the field on the left (e.g. search). */
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', hasError, leadingIcon, trailingIcon, ...props }, ref) => {
    const field = (
      <input
        type={type}
        ref={ref}
        aria-invalid={hasError ?? undefined}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
          hasError ? 'border-destructive' : 'border-border hover:border-brand-navy/40',
          leadingIcon && 'pl-10',
          trailingIcon && 'pr-10',
          className,
        )}
        {...props}
      />
    );

    if (!leadingIcon && !trailingIcon) return field;

    return (
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {leadingIcon}
          </span>
        ) : null}
        {field}
        {trailingIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }
>(({ className, hasError, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={hasError ?? undefined}
    className={cn(
      'flex min-h-[96px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground transition-colors',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
      hasError ? 'border-destructive' : 'border-border hover:border-brand-navy/40',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Input, Textarea };
```

## `client/src/components/ui/label.tsx`

```tsx
'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  >
    {children}
    {required ? (
      <span className="ml-0.5 text-destructive" aria-hidden>
        *
      </span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

/** Field wrapper: label + control + hint/error, wired for accessibility. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { Label };
```

## `client/src/components/ui/pagination.tsx`

```tsx
'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Pagination and Breadcrumb. */

/** Build a compact page list: 1 … 4 5 6 … 20 */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const output: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push('gap');
    output.push(page);
    previous = page;
  }
  return output;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}): JSX.Element | null {
  if (totalPages <= 1) return null;

  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(base, 'border-border bg-white text-brand-navy hover:border-brand-navy')}
      >
        <ChevronLeft className="size-4" />
      </button>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          // eslint-disable-next-line react/no-array-index-key -- gaps are positional
          <span key={`gap-${index}`} className="px-1 text-muted-foreground">
            <MoreHorizontal className="size-4" />
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              base,
              entry === page
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-white text-brand-navy hover:border-brand-navy',
            )}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(base, 'border-border bg-white text-brand-navy hover:border-brand-navy')}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <Link href="/" className="inline-flex items-center hover:text-brand-cyan" aria-label="Home">
            <Home className="size-3.5" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5 opacity-50" aria-hidden />
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-brand-cyan">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-brand-navy" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

## `client/src/components/ui/select.tsx`

```tsx
'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** shadcn/ui Select on Radix. Keyboard and screen-reader ready by default. */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm',
      'transition-colors hover:border-brand-navy/40',
      'focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-60 [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-modal max-h-72 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-panel',
        'data-[state=open]:animate-slide-down',
        position === 'popper' && 'data-[side=bottom]:translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none',
      'focus:bg-brand-navy/5 focus:text-brand-navy data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4 text-brand-cyan" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel };
```

## `client/src/components/ui/separator.tsx`

```tsx
'use client';

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

/** Section heading with the industrial cyan rule used across the storefront. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
          {title}
        </h2>
        <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export { Separator };
```

## `client/src/components/ui/slider.tsx`

```tsx
'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { formatPKR } from '@/lib/utils';

/** Range slider — the catalogue price filter is its main use. */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-brand-navy/15">
      <SliderPrimitive.Range className="absolute h-full bg-brand-cyan" />
    </SliderPrimitive.Track>
    {(props.value ?? props.defaultValue ?? [0]).map((_, index) => (
      <SliderPrimitive.Thumb
        // eslint-disable-next-line react/no-array-index-key -- thumbs are positional
        key={index}
        className="block size-4 rounded-full border-2 border-brand-cyan bg-white shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 disabled:pointer-events-none"
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

/** Price range filter with live PKR labels either side of the track. */
export function PriceRangeSlider({
  min,
  max,
  value,
  onValueChange,
  step = 500,
}: {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  step?: number;
}): JSX.Element {
  return (
    <div className="space-y-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(next) => onValueChange([next[0] ?? min, next[1] ?? max])}
        aria-label="Price range"
      />
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{formatPKR(value[0])}</span>
        <span>{formatPKR(value[1])}</span>
      </div>
    </div>
  );
}

export { Slider };
```

## `client/src/components/ui/table.tsx`

```tsx
'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Table primitives plus a small sortable/paginated wrapper. */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('bg-brand-navy', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-border bg-white', className)} {...props} />
  ),
);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('transition-colors hover:bg-surface', className)} {...props} />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-2xs font-semibold uppercase tracking-wide text-white',
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';

/* ----------------------------- Sortable table ---------------------------- */

export interface Column<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc';

/**
 * Client-side sortable table for modest datasets (admin panels, spec tables).
 * Server-paginated lists pass `onSort` and sort upstream instead.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'Nothing to show yet.',
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  className?: string;
}): JSX.Element {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState<SortDirection>('asc');

  const sorted = React.useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === 'number' && typeof right === 'number') {
        return direction === 'asc' ? left - right : right - left;
      }
      const result = String(left ?? '').localeCompare(String(right ?? ''));
      return direction === 'asc' ? result : -result;
    });
  }, [rows, sortKey, direction]);

  const toggle = (key: string): void => {
    if (sortKey === key) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <tr>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
              aria-sort={sortKey === column.key ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {column.sortable ? (
                <button
                  type="button"
                  onClick={() => toggle(column.key)}
                  className="inline-flex items-center gap-1 uppercase transition-colors hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                >
                  {column.header}
                  {sortKey !== column.key ? (
                    <ChevronsUpDown className="size-3 opacity-60" />
                  ) : direction === 'asc' ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {sorted.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key -- rows may lack a stable id in mock data
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
              >
                {column.render ? column.render(row) : String(row[column.key] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

## `client/src/components/ui/tabs.tsx`

```tsx
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tabs and Accordion — used for product specifications and the FAQ. */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex w-full items-center gap-1 border-b border-border', className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // The active tab is marked with a cyan underline, not a filled pill —
      // it reads as a technical datasheet rather than an app.
      '-mb-px whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors',
      'hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
      'data-[state=active]:border-brand-cyan data-[state=active]:text-brand-navy',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('pt-5 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn('border-b border-border', className)} {...props} />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-brand-navy transition-colors',
        'hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan',
        '[&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('pb-4 text-muted-foreground', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
};
```

## `client/src/components/ui/toast.tsx`

```tsx
'use client';

import { Toaster as Sonner, toast } from 'sonner';

/**
 * Toaster built on sonner, themed to the brand palette.
 * Positioned bottom-centre on phones so it never covers the sticky bottom nav
 * or the floating WhatsApp button.
 */
export function Toaster(): JSX.Element {
  return (
    <Sonner
      position="top-right"
      mobileOffset={{ bottom: 88 }}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-lg border border-border bg-white text-foreground shadow-panel font-sans text-sm',
          title: 'font-semibold text-brand-navy',
          description: 'text-muted-foreground',
          actionButton: 'bg-brand-cyan text-white rounded-md',
          cancelButton: 'bg-muted text-muted-foreground rounded-md',
          success: 'border-success/30',
          error: 'border-destructive/30',
          warning: 'border-warning/40',
          info: 'border-brand-cyan/30',
        },
      }}
      closeButton
      richColors={false}
      duration={4000}
    />
  );
}

export { toast };
```

## `client/src/components/ui/tooltip.tsx`

```tsx
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

/** Tooltip and DropdownMenu. */

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-modal max-w-xs rounded-md bg-brand-dark px-2.5 py-1.5 text-xs font-medium text-white shadow-panel',
        'animate-slide-down',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Convenience wrapper for the common single-trigger case. */
export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}): JSX.Element {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  );
}

const DropdownMenu = DropdownPrimitive.Root;
const DropdownMenuTrigger = DropdownPrimitive.Trigger;
const DropdownMenuGroup = DropdownPrimitive.Group;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-modal min-w-[12rem] overflow-hidden rounded-lg border border-border bg-white p-1 text-foreground shadow-panel',
        'data-[state=open]:animate-slide-down',
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors',
      'focus:bg-brand-navy/5 focus:text-brand-navy data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      '[&_svg]:size-4 [&_svg]:text-muted-foreground',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownPrimitive.Item.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={cn('px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownPrimitive.Separator.displayName;

export {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
```

## `client/src/components/layout/announcement-bar.tsx`

```tsx
'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useUiStore } from '@/store/ui-store';

/**
 * Announcement strip.
 * The copy comes from Settings in Phase 6; the props keep that swap trivial.
 * Dismissal is per-session on purpose — a promotion the customer dismissed on
 * Monday should still be visible next week.
 */
export function AnnouncementBar({
  text,
  link,
}: {
  text?: string;
  link?: string;
}): JSX.Element | null {
  const dismissed = useUiStore((state) => state.announcementDismissed);
  const dismiss = useUiStore((state) => state.dismissAnnouncement);

  if (!text || dismissed) return null;

  return (
    <div className="relative bg-brand-cyan text-white">
      <div className="container flex items-center justify-center gap-2 py-2 pr-8 text-center text-xs font-medium sm:text-sm">
        {link ? (
          <Link href={link} className="underline-offset-2 hover:underline">
            {text}
          </Link>
        ) : (
          <span>{text}</span>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
```

## `client/src/components/layout/index.ts`

```ts
export { Header } from './header';
export { Footer } from './footer';
export { Logo } from './logo';
export { AnnouncementBar } from './announcement-bar';
export { WhatsAppButton, FloatingWhatsApp } from './whatsapp-button';
export { ScrollToTop } from './scroll-to-top';
export { MobileBottomNav } from './header/mobile-nav';
export { SearchBar } from './header/search-bar';
export { MegaMenu } from './header/mega-menu';
export { NavBar, PRIMARY_NAV } from './header/nav-bar';
```

## `client/src/components/layout/logo.tsx`

```tsx
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Wordmark. Rendered as text rather than an image so it stays crisp at any
 * size and costs nothing on a 3G first paint; the SVG asset is used for
 * favicons and the PDF letterhead instead.
 */
export function Logo({
  variant = 'dark',
  className,
  href = '/',
}: {
  /** `dark` for light backgrounds, `light` for the navy footer. */
  variant?: 'dark' | 'light';
  className?: string;
  href?: string | null;
}): JSX.Element {
  const content = (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span
        className={cn(
          'font-heading text-xl font-extrabold uppercase tracking-tight sm:text-2xl',
          variant === 'dark' ? 'text-brand-navy' : 'text-white',
        )}
      >
        Fast<span className="text-brand-cyan">Traders</span>
      </span>
      <span
        className={cn(
          'mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em]',
          variant === 'dark' ? 'text-muted-foreground' : 'text-white/60',
        )}
      >
        Industrial &amp; Electrical
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="Fast Traders — home" className="shrink-0">
      {content}
    </Link>
  );
}
```

## `client/src/components/layout/scroll-to-top.tsx`

```tsx
'use client';

import { ArrowUp } from 'lucide-react';
import { useScrollPosition } from '@/hooks/use-scroll-position';

/** Appears after a screen and a half of scrolling; sits above the WhatsApp bubble. */
export function ScrollToTop(): JSX.Element | null {
  const scrollY = useScrollPosition();

  if (scrollY < 600) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-40 right-4 z-header flex size-11 items-center justify-center rounded-full border border-border bg-white text-brand-navy shadow-panel transition-colors hover:bg-brand-navy hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan lg:bottom-24"
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
```

## `client/src/components/layout/whatsapp-button.tsx`

```tsx
'use client';

import { MessageCircle } from 'lucide-react';
import { CONTACT } from '@/lib/constants';
import { cn, whatsappLink } from '@/lib/utils';

const DEFAULT_MESSAGE =
  'Hello Fast Traders, I would like to enquire about industrial equipment.';

/** Inline WhatsApp call-to-action for the header. */
export function WhatsAppButton({
  message = DEFAULT_MESSAGE,
  className,
}: {
  message?: string;
  className?: string;
}): JSX.Element {
  return (
    <a
      href={whatsappLink(CONTACT.whatsappDigits, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1da851] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2',
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden />
      <span className="hidden xl:inline">WhatsApp</span>
      <span className="hidden sm:inline xl:hidden">Chat</span>
      <span className="sr-only sm:not-sr-only sm:hidden">WhatsApp us</span>
    </a>
  );
}

/**
 * Floating WhatsApp bubble.
 * Sits above the mobile bottom nav (`bottom-24`) so the two never overlap.
 */
export function FloatingWhatsApp({ message = DEFAULT_MESSAGE }: { message?: string }): JSX.Element {
  return (
    <a
      href={whatsappLink(CONTACT.whatsappDigits, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Fast Traders on WhatsApp"
      className="fixed bottom-24 right-4 z-header flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-panel transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 lg:bottom-6"
    >
      <MessageCircle className="size-7" aria-hidden />
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#25D366] opacity-20" aria-hidden />
    </a>
  );
}
```

## `client/src/components/layout/header/cart-buttons.tsx`

```tsx
'use client';

import Link from 'next/link';
import { FileText, ShoppingCart, User } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useCartCount } from '@/store/cart-store';
import { cn } from '@/lib/utils';

/**
 * The two cart entry points plus the account link.
 *
 * Two carts is unusual, so they are visually distinct: the inquiry list uses a
 * document icon and the navy badge, the shopping cart a trolley and cyan.
 */

function IconLink({
  href,
  label,
  count,
  badgeClass,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  badgeClass?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Tooltip content={label}>
      <Link
        href={href}
        aria-label={count ? `${label} (${count} item${count === 1 ? '' : 's'})` : label}
        className="relative flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan [&_svg]:size-5"
      >
        {children}
        {count && count > 0 ? (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[18px] text-white',
              badgeClass,
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Link>
    </Tooltip>
  );
}

export function HeaderActions(): JSX.Element {
  const cartCount = useCartCount('shopping');
  const inquiryCount = useCartCount('inquiry');

  return (
    <div className="flex items-center gap-0.5">
      <IconLink href="/account" label="My account">
        <User />
      </IconLink>

      <IconLink
        href="/inquiry"
        label="Inquiry list"
        count={inquiryCount}
        badgeClass="bg-brand-navy"
      >
        <FileText />
      </IconLink>

      <IconLink
        href="/cart"
        label="Shopping cart"
        count={cartCount}
        badgeClass="bg-brand-cyan"
      >
        <ShoppingCart />
      </IconLink>
    </div>
  );
}
```

## `client/src/components/layout/header/index.tsx`

```tsx
'use client';

import { useScrollPosition } from '@/hooks/use-scroll-position';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { WhatsAppButton } from '../whatsapp-button';
import { HeaderActions } from './cart-buttons';
import { MobileDrawer, MobileSearch } from './mobile-nav';
import { NavBar } from './nav-bar';
import { SearchBar } from './search-bar';
import { TopStrip } from './top-strip';

/**
 * Three-tier site header.
 *
 *   1. Navy top strip  — tagline, phone, email, social (desktop only)
 *   2. White main bar  — logo, search, account, both carts, WhatsApp (sticky)
 *   3. Navy nav bar    — mega-menu + primary navigation (desktop only)
 *
 * Only the main bar sticks. Keeping all three pinned would eat 150 px of a
 * phone viewport, which matters more here than on a desktop-first site.
 */
export function Header(): JSX.Element {
  const scrollY = useScrollPosition();
  const isScrolled = scrollY > 8;

  return (
    <header className="relative">
      <TopStrip />

      <div
        className={cn(
          'sticky top-0 z-header border-b border-border bg-white transition-shadow',
          isScrolled && 'shadow-card',
        )}
      >
        <div className="container flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
          <MobileDrawer />
          <Logo />

          <div className="hidden min-w-0 flex-1 lg:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:gap-3">
            <MobileSearch />
            <HeaderActions />
            <WhatsAppButton className="hidden sm:inline-flex" />
          </div>
        </div>
      </div>

      <NavBar />
    </header>
  );
}
```

## `client/src/components/layout/header/mega-menu.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { mockBrands, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * "All Categories" mega-menu.
 *
 * Three columns: the category tree on the left, the hovered category's
 * children in the middle, and featured brands plus a promo panel on the right.
 * Opens on hover for mouse users and on click/keyboard for everyone else.
 */
export function MegaMenu(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(mockCategories[0]?.slug ?? '');

  const active = mockCategories.find((category) => category.slug === activeSlug) ?? mockCategories[0];

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-12 items-center gap-2 bg-brand-cyan px-4 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <LayoutGrid className="size-4" aria-hidden />
        All Categories
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-modal w-[min(64rem,calc(100vw-2rem))] animate-slide-down rounded-b-lg border border-t-0 border-border bg-white shadow-panel">
          <div className="grid grid-cols-12">
            {/* Column 1 — root categories */}
            <ul className="col-span-4 border-r border-border py-2">
              {mockCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    onMouseEnter={() => setActiveSlug(category.slug)}
                    onFocus={() => setActiveSlug(category.slug)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                      category.slug === activeSlug
                        ? 'bg-brand-navy/5 text-brand-navy'
                        : 'text-foreground hover:bg-brand-navy/5 hover:text-brand-navy',
                    )}
                  >
                    {category.name}
                    {category.children.length > 0 ? (
                      <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Column 2 — children of the hovered category */}
            <div className="col-span-5 border-r border-border p-5">
              <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                {active?.name}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {(active?.children ?? []).map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/category/${child.slug}`}
                      className="block py-1 text-sm text-foreground transition-colors hover:text-brand-cyan"
                    >
                      {child.name}
                    </Link>
                    {child.children ? (
                      <ul className="mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                        {child.children.map((grandchild) => (
                          <li key={grandchild.slug}>
                            <Link
                              href={`/category/${grandchild.slug}`}
                              className="block py-0.5 text-xs text-muted-foreground transition-colors hover:text-brand-cyan"
                            >
                              {grandchild.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — featured brands + promo */}
            <div className="col-span-3 bg-surface p-5">
              <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                Featured brands
              </p>
              <ul className="mb-5 grid grid-cols-2 gap-1.5">
                {mockBrands.slice(0, 6).map((brand) => (
                  <li key={brand.slug}>
                    <Link
                      href={`/brands/${brand.slug}`}
                      className="flex h-9 items-center justify-center rounded border border-border bg-white px-2 text-[10px] font-bold uppercase text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                    >
                      {brand.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="bg-brand-gradient rounded-lg p-4 text-white">
                <p className="font-heading text-sm font-bold uppercase">Bulk enquiry?</p>
                <p className="mt-1 text-xs text-white/75">
                  Send your bill of materials and get one consolidated quote within a working day.
                </p>
                <Link
                  href="/request-quote"
                  className="mt-3 inline-flex h-8 items-center rounded-md bg-brand-cyan px-3 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-white hover:text-brand-navy"
                >
                  Request a quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

## `client/src/components/layout/header/mobile-nav.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Home,
  LayoutGrid,
  Mail,
  Menu,
  Phone,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/tabs';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { CONTACT } from '@/lib/constants';
import { mockCategories } from '@/lib/mock-data';
import { useCartCount } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { Logo } from '../logo';
import { PRIMARY_NAV } from './nav-bar';
import { SearchBar } from './search-bar';

/** Hamburger drawer holding the full category tree and contact details. */
export function MobileDrawer(): JSX.Element {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNav);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <SheetContent side="left" className="w-[min(21rem,88vw)]">
        <div className="flex items-center border-b border-border p-4">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto">
          <Accordion type="multiple" className="px-4">
            {mockCategories.map((category) => (
              <AccordionItem key={category.slug} value={category.slug}>
                {category.children.length === 0 ? (
                  <Link
                    href={`/category/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex py-4 text-sm font-semibold text-brand-navy"
                  >
                    {category.name}
                  </Link>
                ) : (
                  <>
                    <AccordionTrigger>{category.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pl-1">
                        {category.children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/category/${child.slug}`}
                              onClick={() => setOpen(false)}
                              className="block py-1.5 text-sm text-foreground hover:text-brand-cyan"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                )}
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="border-t border-border px-4 py-2">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-navy"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-border bg-surface p-4 text-sm">
            <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="flex items-center gap-2 text-brand-navy">
              <Phone className="size-4 text-brand-cyan" aria-hidden />
              {CONTACT.mobile}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 text-brand-navy">
              <Mail className="size-4 text-brand-cyan" aria-hidden />
              {CONTACT.email}
            </a>
            <p className="pt-1 text-xs text-muted-foreground">{CONTACT.address.full}</p>
          </div>
        </div>

        <DialogTitle className="sr-only">Site menu</DialogTitle>
      </SheetContent>
    </Dialog>
  );
}

/** Collapsible search row, shown under the main bar on phones. */
export function MobileSearch(): JSX.Element {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearch);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle search"
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-lg text-brand-navy transition-colors hover:bg-brand-navy/5 lg:hidden"
      >
        <Search className="size-5" />
        <ChevronDown className={cn('ml-0.5 size-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full animate-slide-down border-b border-border bg-white p-3 lg:hidden">
          <SearchBar autoFocus />
        </div>
      ) : null}
    </>
  );
}

/**
 * Sticky bottom navigation.
 * Thumb-reachable on a phone, which is how most of this traffic arrives.
 */
export function MobileBottomNav(): JSX.Element {
  const pathname = usePathname();
  const cartCount = useCartCount('shopping');
  const setMobileNav = useUiStore((state) => state.setMobileNav);
  const setSearch = useUiStore((state) => state.setSearch);

  const items = [
    { label: 'Home', href: '/', Icon: Home },
    { label: 'Categories', href: '#categories', Icon: LayoutGrid, onClick: () => setMobileNav(true) },
    { label: 'Search', href: '#search', Icon: Search, onClick: () => setSearch(true) },
    { label: 'Cart', href: '/cart', Icon: ShoppingCart, badge: cartCount },
    { label: 'Account', href: '/account', Icon: User },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-header border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ label, href, Icon, onClick, badge }) => {
          const isActive = pathname === href;
          const content = (
            <>
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {badge && badge > 0 ? (
                  <span className="absolute -right-2 -top-1 flex min-w-[16px] justify-center rounded-full bg-brand-cyan px-1 text-[9px] font-bold leading-4 text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </>
          );

          const className = cn(
            'flex h-14 w-full flex-col items-center justify-center gap-0.5 transition-colors',
            isActive ? 'text-brand-cyan' : 'text-muted-foreground hover:text-brand-navy',
          );

          return (
            <li key={label}>
              {onClick ? (
                <button type="button" onClick={onClick} className={className} aria-label={label}>
                  {content}
                </button>
              ) : (
                <Link href={href} className={className} aria-current={isActive ? 'page' : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

## `client/src/components/layout/header/nav-bar.tsx`

```tsx
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { MegaMenu } from './mega-menu';

/** Tier 3: the primary navigation band, navy with a cyan mega-menu launcher. */

export const PRIMARY_NAV = [
  { label: 'Products', href: '/products' },
  { label: 'Brands', href: '/brands' },
  { label: 'Industries', href: '/industries' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

export function NavBar(): JSX.Element {
  return (
    <nav aria-label="Primary" className="hidden bg-brand-navy text-white lg:block">
      <div className="container flex items-stretch">
        <MegaMenu />

        <ul className="flex flex-1 items-stretch">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-12 items-center px-4 text-sm font-semibold uppercase tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/request-quote"
          className="flex h-12 items-center gap-2 bg-white/10 px-5 text-sm font-bold uppercase tracking-wide text-brand-cyan transition-colors hover:bg-brand-cyan hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <FileText className="size-4" aria-hidden />
          Request a Quote
        </Link>
      </div>
    </nav>
  );
}
```

## `client/src/components/layout/header/search-bar.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { mockSearchScopes, mockSuggest, type MockProduct } from '@/lib/mock-data';
import { cn, formatPKR } from '@/lib/utils';

/**
 * Catalogue search with a scope dropdown and live autocomplete.
 *
 * Trade buyers paste part numbers, so SKU matches rank first and the SKU is
 * shown on every row. Wired to mock data in Phase 5; the only change in
 * Phase 6 is swapping `mockSuggest` for the `/search/suggest` query.
 */
export function SearchBar({ className, autoFocus }: { className?: string; autoFocus?: boolean }): JSX.Element {
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState('all');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounce(term, 300);
  const results: MockProduct[] = debounced.length >= 2 ? mockSuggest(debounced) : [];

  // Close the panel on an outside click.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') setOpen(false);
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-white focus-within:ring-2 focus-within:ring-brand-cyan"
      >
        <div className="hidden w-44 shrink-0 border-r border-border sm:block">
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger
              aria-label="Search within category"
              className="h-11 rounded-none border-0 bg-surface text-xs font-medium focus:ring-0 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockSearchScopes.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search by product, SKU or part number…"
          // Full combobox semantics: `aria-expanded` is only valid on the
          // combobox role, not on a bare textbox.
          role="combobox"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          className="h-11 min-w-0 flex-1 bg-white px-3 text-sm outline-none placeholder:text-muted-foreground"
        />

        {term ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Clear search"
            className="px-2 text-muted-foreground transition-colors hover:text-brand-navy"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <button
          type="submit"
          aria-label="Search"
          className="flex h-11 items-center gap-2 bg-brand-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-cyan sm:px-5"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {open && debounced.length >= 2 ? (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-modal max-h-96 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-panel"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No match for “{debounced}”. Try the part number, or{' '}
              <Link href="/request-quote" className="text-brand-cyan underline">
                ask us for a quote
              </Link>
              .
            </p>
          ) : (
            results.map((product, index) => (
              <Link
                key={product.id}
                id={`search-option-${index}`}
                href={`/products/${product.slug}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 transition-colors',
                  index === activeIndex ? 'bg-brand-navy/5' : 'hover:bg-brand-navy/5',
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-surface text-[9px] font-bold text-brand-navy">
                  {product.brand.slice(0, 3).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.sku} · {product.brand}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-brand-navy">
                  {product.pricingMode === 'quote' || !product.price ? (
                    <span className="text-xs font-semibold text-brand-cyan">On request</span>
                  ) : (
                    formatPKR(product.price)
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
```

## `client/src/components/layout/header/top-strip.tsx`

```tsx
import { Facebook, Instagram, Linkedin, Mail, Phone } from 'lucide-react';
import { CONTACT, SITE } from '@/lib/constants';

/**
 * Tier 1 of the header: navy strip carrying the tagline and the two ways
 * Pakistani trade customers actually make contact — phone and email.
 * Hidden below `lg`; the mobile drawer surfaces the same details.
 */
export function TopStrip(): JSX.Element {
  return (
    <div className="hidden bg-brand-dark text-white lg:block">
      <div className="container flex h-9 items-center justify-between text-xs">
        <p className="font-medium tracking-wide text-white/80">{SITE.tagline}</p>

        <div className="flex items-center gap-5">
          <a
            href={`tel:${CONTACT.landline.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cyan"
          >
            <Phone className="size-3.5" aria-hidden />
            {CONTACT.landline}
          </a>

          <a
            href={`mailto:${CONTACT.email}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-cyan"
          >
            <Mail className="size-3.5" aria-hidden />
            {CONTACT.email}
          </a>

          <div className="flex items-center gap-2 border-l border-white/15 pl-5">
            {[
              { Icon: Facebook, label: 'Facebook', href: '#' },
              { Icon: Instagram, label: 'Instagram', href: '#' },
              { Icon: Linkedin, label: 'LinkedIn', href: '#' },
            ].map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={`Fast Traders on ${label}`}
                className="rounded p-1 text-white/70 transition-colors hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## `client/src/components/layout/footer/brand-strip.tsx`

```tsx
import Link from 'next/link';
import { mockBrands } from '@/lib/mock-data';

/**
 * Authorised-brand strip.
 * Grayscale until hover — the client's authorisations are a trust signal, and
 * twelve full-colour logos at once would fight the navy footer.
 */
export function BrandStrip(): JSX.Element {
  return (
    <div className="border-t border-white/10 py-8">
      <p className="mb-5 text-center text-2xs font-bold uppercase tracking-[0.2em] text-white/40">
        Authorised &amp; stocked brands
      </p>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {mockBrands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={`/brands/${brand.slug}`}
              title={`${brand.name} — ${brand.country}`}
              className="group flex h-14 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/45 grayscale transition-all hover:border-brand-cyan/50 hover:bg-white/10 hover:text-brand-cyan hover:grayscale-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## `client/src/components/layout/footer/index.tsx`

```tsx
import Link from 'next/link';
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Smartphone } from 'lucide-react';
import { CONTACT, SITE } from '@/lib/constants';
import { mockCategories } from '@/lib/mock-data';
import { Logo } from '../logo';
import { BrandStrip } from './brand-strip';
import { NewsletterSignup } from './newsletter';

/** Navy site footer: four columns, newsletter row, brand strip, legal bar. */

const QUICK_LINKS = [
  { label: 'All Products', href: '/products' },
  { label: 'Brands', href: '/brands' },
  { label: 'Request a Quote', href: '/request-quote' },
  { label: 'Track an Order', href: '/orders/track' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

const SOCIALS = [
  { Icon: Facebook, label: 'Facebook', href: '#' },
  { Icon: Instagram, label: 'Instagram', href: '#' },
  { Icon: Linkedin, label: 'LinkedIn', href: '#' },
] as const;

function ColumnHeading({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-white">
      {children}
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-brand-cyan" aria-hidden />
    </h3>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="bg-brand-dark text-white">
      <NewsletterSignup />

      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* 1 — identity */}
          <div>
            <Logo variant="light" />
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {SITE.tagline}. Supplying switchgear, automation and control components to industry
              across Pakistan from our counter on Bull Road, Lahore.
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={`Fast Traders on ${label}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors hover:border-brand-cyan hover:bg-brand-cyan hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* 2 — quick links */}
          <nav aria-label="Quick links">
            <ColumnHeading>Quick Links</ColumnHeading>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/60 transition-colors hover:text-brand-cyan"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3 — categories */}
          <nav aria-label="Top categories">
            <ColumnHeading>Top Categories</ColumnHeading>
            <ul className="space-y-2.5">
              {mockCategories.slice(0, 6).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-sm text-white/60 transition-colors hover:text-brand-cyan"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 4 — the full business card */}
          <div>
            <ColumnHeading>Get In Touch</ColumnHeading>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <span className="text-white/70">
                  {CONTACT.address.line1},<br />
                  {CONTACT.address.line2}, {CONTACT.address.city},<br />
                  {CONTACT.address.country}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Smartphone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.mobile}
                  <span className="ml-1.5 text-2xs uppercase text-white/40">Mobile / WhatsApp</span>
                </a>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.landline}
                  <span className="ml-1.5 text-2xs uppercase text-white/40">Landline</span>
                </a>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href={`mailto:${CONTACT.email}`} className="text-white/70 hover:text-brand-cyan">
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex gap-2.5">
                <Globe className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
                <a href="https://www.fasttraders.co" className="text-white/70 hover:text-brand-cyan">
                  www.fasttraders.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        <BrandStrip />
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Fast Traders. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-brand-cyan">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-brand-cyan">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

## `client/src/components/layout/footer/newsletter.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

/**
 * Newsletter signup.
 * Wired to `POST /newsletter` in Phase 6; here it validates and reports
 * optimistically so the interaction can be reviewed.
 */
export function NewsletterSignup(): JSX.Element {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }

    setIsLoading(true);
    // Placeholder for the real mutation.
    setTimeout(() => {
      setIsLoading(false);
      setEmail('');
      toast.success('Subscribed', { description: 'You will hear from us when new stock lands.' });
    }, 600);
  };

  return (
    <div className="border-y border-white/10 bg-white/[0.03]">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 lg:flex-row">
        <div className="text-center lg:text-left">
          <p className="font-heading text-base font-bold uppercase tracking-tight text-white">
            New stock &amp; price updates
          </p>
          <p className="mt-1 text-sm text-white/60">
            Occasional emails about new arrivals and trade offers. No spam.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            aria-label="Email address for the newsletter"
            required
            className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-brand-cyan"
          />
          <Button type="submit" variant="cta" size="lg" isLoading={isLoading} loadingText="Sending">
            <Send />
            Subscribe
          </Button>
        </form>
      </div>
    </div>
  );
}
```

## `client/src/store/cart-store.ts`

```ts
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * Client-side mirror of the two server carts.
 *
 * The server remains the source of truth (Phase 3 persists both carts against
 * a user or a guest session cookie); this store exists so badge counts and the
 * drawer render instantly, before any request resolves.
 */

export interface CartLine {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  unit: string;
  qty: number;
  /** Absent on inquiry lines and on quote-only products. */
  price?: number;
  /** Buyer note carried into the RFQ. */
  note?: string;
}

interface CartState {
  shopping: CartLine[];
  inquiry: CartLine[];
  /** False until the persisted state has rehydrated — prevents SSR badge flicker. */
  hydrated: boolean;
  addToCart: (line: CartLine) => void;
  addToInquiry: (line: CartLine) => void;
  updateQty: (cart: 'shopping' | 'inquiry', productId: string, qty: number) => void;
  remove: (cart: 'shopping' | 'inquiry', productId: string) => void;
  clear: (cart: 'shopping' | 'inquiry') => void;
  setHydrated: () => void;
}

function upsert(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((item) => item.productId === line.productId);
  if (!existing) return [...lines, line];
  return lines.map((item) =>
    item.productId === line.productId ? { ...item, qty: item.qty + line.qty } : item,
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      shopping: [],
      inquiry: [],
      hydrated: false,

      addToCart: (line) => set((state) => ({ shopping: upsert(state.shopping, line) })),
      addToInquiry: (line) => set((state) => ({ inquiry: upsert(state.inquiry, line) })),

      updateQty: (cart, productId, qty) =>
        set((state) => {
          const next = state[cart].map((item) =>
            item.productId === productId ? { ...item, qty: Math.max(1, qty) } : item,
          );
          return cart === 'shopping' ? { shopping: next } : { inquiry: next };
        }),

      remove: (cart, productId) =>
        set((state) => {
          const next = state[cart].filter((item) => item.productId !== productId);
          return cart === 'shopping' ? { shopping: next } : { inquiry: next };
        }),

      clear: (cart) =>
        set(() => (cart === 'shopping' ? { shopping: [] } : { inquiry: [] })),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEYS.cart,
      storage: createJSONStorage(() => localStorage),
      // `hydrated` is runtime-only; persisting it would defeat the purpose.
      partialize: (state) => ({ shopping: state.shopping, inquiry: state.inquiry }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Total units in a cart. Returns 0 until hydration to keep SSR and CSR in step. */
export function useCartCount(cart: 'shopping' | 'inquiry'): number {
  return useCartStore((state) =>
    state.hydrated ? state[cart].reduce((sum, line) => sum + line.qty, 0) : 0,
  );
}

export function useCartSubtotal(): number {
  return useCartStore((state) =>
    state.shopping.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0),
  );
}
```

## `client/src/store/ui-store.ts`

```ts
'use client';

import { create } from 'zustand';

/** Ephemeral UI state: drawers, panels and the announcement bar. */

interface UiState {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  inquiryDrawerOpen: boolean;
  searchOpen: boolean;
  announcementDismissed: boolean;
  setMobileNav: (open: boolean) => void;
  setCartDrawer: (open: boolean) => void;
  setInquiryDrawer: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  dismissAnnouncement: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  mobileNavOpen: false,
  cartDrawerOpen: false,
  inquiryDrawerOpen: false,
  searchOpen: false,
  announcementDismissed: false,

  setMobileNav: (open) => set({ mobileNavOpen: open }),
  setCartDrawer: (open) => set({ cartDrawerOpen: open }),
  setInquiryDrawer: (open) => set({ inquiryDrawerOpen: open }),
  setSearch: (open) => set({ searchOpen: open }),
  dismissAnnouncement: () => set({ announcementDismissed: true }),
}));
```

## `client/src/hooks/use-debounce.ts`

```ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Delay a rapidly changing value.
 * Search autocomplete uses 300 ms — long enough to avoid a request per
 * keystroke on a 3G connection, short enough to still feel live.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

## `client/src/hooks/use-media-query.ts`

```ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Reactive media query.
 * Returns `false` on the server so the mobile-first markup is what gets
 * rendered during SSR; the desktop branch swaps in after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)');
```

## `client/src/hooks/use-scroll-position.ts`

```ts
'use client';

import { useEffect, useState } from 'react';

/** Track vertical scroll, throttled to one update per animation frame. */
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let frame = 0;

    const onScroll = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return scrollY;
}
```

## `client/src/app/error.tsx`

```tsx
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
```

## `client/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---------------------------------------------------------------------------
   Fast Traders — design tokens
   Brand palette expressed as HSL triplets so Tailwind can apply opacity
   modifiers (e.g. `bg-brand-navy/80`).

     navy   #1B2A6B -> 229 60% 26%
     cyan   #00AEEF -> 196 100% 47%
     dark   #0F1B4C -> 228 67% 18%
     bg     #F7F9FC -> 216 45% 98%
     ink    #1A1A1A -> 0 0% 10%
     muted  #5A6472 -> 215 12% 40%
--------------------------------------------------------------------------- */

@layer base {
  :root {
    /* Raw brand palette */
    --brand-navy: 229 60% 26%;
    --brand-cyan: 196 100% 47%;
    --brand-dark: 228 67% 18%;
    --brand-surface: 216 45% 98%;
    --brand-ink: 0 0% 10%;
    --brand-muted: 215 12% 40%;

    /* shadcn/ui semantic tokens mapped onto the brand palette */
    --background: var(--brand-surface);
    --foreground: var(--brand-ink);

    --card: 0 0% 100%;
    --card-foreground: var(--brand-ink);

    --popover: 0 0% 100%;
    --popover-foreground: var(--brand-ink);

    /* Primary = navy. Accent/CTA = cyan. */
    --primary: var(--brand-navy);
    --primary-foreground: 0 0% 100%;

    --secondary: 216 30% 94%;
    --secondary-foreground: var(--brand-navy);

    --accent: var(--brand-cyan);
    --accent-foreground: var(--brand-dark);

    --muted: 216 30% 96%;
    --muted-foreground: var(--brand-muted);

    --destructive: 0 72% 45%;
    --destructive-foreground: 0 0% 100%;

    --success: 152 62% 34%;
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 45%;
    --warning-foreground: 0 0% 10%;

    --border: 216 20% 88%;
    --input: 216 20% 88%;
    --ring: var(--brand-cyan);

    --radius: 0.5rem;
  }

  .dark {
    --background: var(--brand-dark);
    --foreground: 0 0% 98%;

    --card: 229 55% 22%;
    --card-foreground: 0 0% 98%;

    --popover: 229 55% 22%;
    --popover-foreground: 0 0% 98%;

    --primary: var(--brand-cyan);
    --primary-foreground: var(--brand-dark);

    --secondary: 229 45% 30%;
    --secondary-foreground: 0 0% 98%;

    --accent: var(--brand-cyan);
    --accent-foreground: var(--brand-dark);

    --muted: 229 40% 28%;
    --muted-foreground: 216 20% 72%;

    --border: 229 40% 32%;
    --input: 229 40% 32%;
    --ring: var(--brand-cyan);
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Industrial heading treatment: tight tracking, heavy weight. */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    @apply font-heading font-bold tracking-tight;
  }

  /* Visible, WCAG-AA-friendly focus ring on every interactive element. */
  :focus-visible {
    @apply outline-none ring-2 ring-brand-cyan ring-offset-2 ring-offset-background;
  }

  /* Respect reduced-motion preferences (Framer Motion reads this too). */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  /* Screen-reader-only helper (used for accessible labels). */
  .sr-only-focusable:not(:focus):not(:focus-within) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .text-balance {
    text-wrap: balance;
  }
}
```

## `client/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AnnouncementBar, FloatingWhatsApp, Footer, Header, ScrollToTop } from '@/components/layout';
import { MobileBottomNav } from '@/components/layout/header/mobile-nav';
import { SITE } from '@/lib/constants';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Industrial & Electrical Equipment, Lahore`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  keywords: [
    'industrial equipment Lahore',
    'electrical equipment Pakistan',
    'circuit breakers Lahore',
    'MCB MCCB ACB supplier',
    'Schneider Electric Pakistan',
    'PLC HMI VFD Lahore',
  ],
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A6B',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-toast rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to content
        </a>

        <Providers>
          {/* Copy comes from Settings once the API is wired in Phase 6. */}
          <AnnouncementBar
            text="Same-day collection from our Bull Road counter — call +92 324 4234990."
            link="/contact"
          />

          <Header />

          {/* Bottom padding clears the sticky mobile nav. */}
          <main id="main" className="pb-16 lg:pb-0">
            {children}
          </main>

          <Footer />

          <FloatingWhatsApp />
          <ScrollToTop />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
```

## `client/src/app/loading.tsx`

```tsx
import { Skeleton } from '@/components/ui/feedback';

/** Route-level loading shell. Mirrors the catalogue layout to avoid a jolt. */
export default function Loading(): JSX.Element {
  return (
    <div className="container py-10">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="mt-6 h-9 w-80" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 4 }, (_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- decorative
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            // eslint-disable-next-line react/no-array-index-key -- decorative
            <div key={index} className="space-y-3 rounded-lg border border-border bg-white p-4">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## `client/src/app/not-found.tsx`

```tsx
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/layout';
import { mockCategories } from '@/lib/mock-data';

export default function NotFound(): JSX.Element {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-heading text-6xl font-extrabold text-brand-navy/15 sm:text-8xl">404</p>
      <h1 className="mt-2 font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy">
        Page not found
      </h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        The page you were looking for has moved or no longer exists. Try searching for the part
        number instead — we stock more than the catalogue shows.
      </p>

      <div className="mt-7 w-full max-w-xl">
        <SearchBar />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href="/products">
            <Search />
            Browse all products
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/request-quote">Request a quote</Link>
        </Button>
      </div>

      <div className="mt-10 w-full max-w-2xl border-t border-border pt-6">
        <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
          Popular categories
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {mockCategories.slice(0, 6).map((category) => (
            <li key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## `client/src/app/page.tsx`

```tsx
import Link from 'next/link';
import { ArrowRight, Palette, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import { SITE } from '@/lib/constants';

/**
 * Placeholder home page for Phase 5.
 * The real homepage (hero, category grid, featured products, brand rail) is
 * built in Phase 6 against live data.
 */
export default function HomePage(): JSX.Element {
  return (
    <>
      <section className="bg-brand-gradient text-white">
        <div className="container grid gap-8 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
              Lahore, Pakistan
            </p>
            <h1 className="text-balance mt-4 font-heading text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-5xl">
              Industrial &amp; Electrical Equipment, In Stock
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70">{SITE.tagline}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <Link href="/products">
                  Browse the catalogue
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/request-quote">Request a quote</Link>
              </Button>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { Icon: ShieldCheck, title: '12 authorised brands', body: 'Terasaki, Schneider, Mitsubishi, Fuji and more.' },
              { Icon: Truck, title: 'Same-day collection', body: 'From our counter on Bull Road, Lahore.' },
              { Icon: Palette, title: 'Trade pricing', body: 'Send a bill of materials, get one quote.' },
            ].map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <Icon className="size-5 shrink-0 text-brand-cyan" aria-hidden />
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container py-14">
        <SectionHeading
          title="Design system"
          description="Phase 5 delivers the component library and global layout. Every primitive is rendered on the style guide."
          action={
            <Button asChild variant="outline">
              <Link href="/style-guide">
                Open the style guide
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </section>
    </>
  );
}
```

## `client/src/app/providers.tsx`

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth-context';
import { useCartStore } from '@/store/cart-store';

/**
 * Client provider tree. Kept out of `layout.tsx` so the root layout stays a
 * Server Component and the page shell can still stream.
 */

/**
 * Zustand's `persist` rehydrates asynchronously. Marking the store hydrated
 * only after mount keeps the SSR badge (0) and the first client render in
 * agreement, avoiding a hydration mismatch.
 */
function CartHydration({ children }: { children: ReactNode }): JSX.Element {
  const setHydrated = useCartStore((state) => state.setHydrated);

  useEffect(() => {
    void useCartStore.persist.rehydrate();
    setHydrated();
  }, [setHydrated]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  // One QueryClient per browser session, created lazily so it is never shared
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Pakistan is mobile-heavy on 3G — cache hard, refetch rarely.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <CartHydration>{children}</CartHydration>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

## `client/src/app/style-guide/page.tsx`

```tsx
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { ButtonsSection } from './sections/buttons-section';
import { CommerceSection } from './sections/commerce-section';
import { DataSection } from './sections/data-section';
import { FeedbackSection } from './sections/feedback-section';
import { FormsSection } from './sections/forms-section';
import { TokensSection } from './sections/tokens-section';

export const metadata: Metadata = {
  title: 'Style guide',
  description: 'Fast Traders design system — tokens, components and patterns.',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'buttons', label: 'Buttons & badges' },
  { id: 'forms', label: 'Forms' },
  { id: 'data', label: 'Data display' },
  { id: 'feedback', label: 'Feedback & overlays' },
  { id: 'commerce', label: 'Commerce' },
] as const;

/** Living component showcase. Excluded from search indexing. */
export default function StyleGuidePage(): JSX.Element {
  return (
    <div className="container py-10">
      <header className="mb-10 border-b border-border pb-8">
        <Badge variant="accent">Phase 5</Badge>
        <h1 className="mt-3 font-heading text-3xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-4xl">
          Fast Traders design system
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Every primitive the storefront and admin panel are built from. Components are wired to
          mock data — swapping in the live API is a change of source, not of markup.
        </p>

        <nav aria-label="Style guide sections" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="space-y-16">
        <TokensSection />
        <ButtonsSection />
        <FormsSection />
        <DataSection />
        <FeedbackSection />
        <CommerceSection />
      </div>
    </div>
  );
}
```

## `client/src/app/style-guide/sections/buttons-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, Chip, StockBadge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, initialsOf } from '@/components/ui/avatar';
import { SectionHeading } from '@/components/ui/separator';

export function ButtonsSection(): JSX.Element {
  const [loading, setLoading] = useState(false);

  const demoLoading = (): void => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1600);
  };

  return (
    <section id="buttons" className="scroll-mt-24">
      <SectionHeading title="Buttons, badges & avatars" />

      <div className="space-y-6 rounded-lg border border-border bg-white p-6">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Variants</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="cta">Add to Cart</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">
              <Trash2 />
              Delete
            </Button>
            <Button variant="link">Text link</Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Sizes</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add">
              <Plus />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            States
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button isLoading>Loading</Button>
            <Button variant="cta" isLoading={loading} loadingText="Adding…" onClick={demoLoading}>
              <Download />
              Click to load
            </Button>
            <Button variant="outline" block className="max-w-xs">
              Full width
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Badges</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="accent">New</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Stock states
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status="in_stock" />
            <StockBadge status="low_stock" />
            <StockBadge status="out_of_stock" />
            <StockBadge status="on_order" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Filter chips
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Schneider Electric" onRemove={() => undefined} />
            <Chip label="Rs. 1,000 – 50,000" onRemove={() => undefined} />
            <Chip label="In stock" onRemove={() => undefined} />
            <Chip label="Read-only chip" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Avatars</p>
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initialsOf('Sharjeel Bin Ejaz')}</AvatarFallback>
            </Avatar>
            <Avatar size="md">
              <AvatarFallback>{initialsOf('Muhammad Imran')}</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>{initialsOf('Ayesha Khan')}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## `client/src/app/style-guide/sections/commerce-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { FileText, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockBadge } from '@/components/ui/badge';
import { PriceDisplay, QuantityStepper, Rating } from '@/components/ui/commerce';
import { SectionHeading } from '@/components/ui/separator';
import { mockProducts } from '@/lib/mock-data';

/**
 * Commerce primitives, shown against the three pricing modes so the hybrid
 * model is visible at a glance.
 */
export function CommerceSection(): JSX.Element {
  const [qty, setQty] = useState(2);
  const [rollQty, setRollQty] = useState(1);

  const samples = [
    { label: 'retail — priced, buyable', product: mockProducts[2] },
    { label: 'both — priced + bulk quote', product: mockProducts[0] },
    { label: 'quote — price hidden', product: mockProducts[1] },
  ];

  return (
    <section id="commerce" className="scroll-mt-24">
      <SectionHeading
        title="Commerce primitives"
        description="PriceDisplay adapts to pricingMode: a quote-only product shows the call to action, never an empty price."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {samples.map(({ label, product }) =>
          product ? (
            <div key={product.id} className="flex flex-col rounded-lg border border-border bg-white p-5">
              <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">{label}</p>

              <p className="text-sm font-semibold text-foreground">{product.name}</p>
              <p className="mt-1 font-mono text-2xs text-muted-foreground">
                {product.sku} · {product.brand}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <Rating value={product.ratingAvg} count={product.reviewCount} size="sm" />
                <StockBadge status={product.stockStatus} />
              </div>

              <div className="mt-4">
                <PriceDisplay
                  price={product.price}
                  comparePrice={product.comparePrice}
                  pricingMode={product.pricingMode}
                  unit={product.unit}
                />
              </div>

              <div className="mt-auto space-y-2 pt-5">
                {product.pricingMode !== 'quote' ? (
                  <Button variant="cta" block>
                    <ShoppingCart />
                    Add to cart
                  </Button>
                ) : null}
                {product.pricingMode !== 'retail' ? (
                  <Button variant={product.pricingMode === 'quote' ? 'cta' : 'outline'} block>
                    <FileText />
                    {product.pricingMode === 'quote' ? 'Request quote' : 'Bulk / trade price?'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null,
        )}
      </div>

      <div className="mt-6 grid gap-6 rounded-lg border border-border bg-white p-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Quantity stepper
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <QuantityStepper value={qty} onChange={setQty} min={1} max={40} />
            <QuantityStepper value={rollQty} onChange={setRollQty} min={1} max={18} unit="rolls" />
            <QuantityStepper value={1} onChange={() => undefined} disabled />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Respects `minOrderQty` and available stock; typing is allowed and clamped.
          </p>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Ratings &amp; PKR formatting
          </p>
          <div className="space-y-3">
            <Rating value={4.6} count={12} />
            <Rating value={3.2} count={5} size="sm" />
            <Rating value={5} />
            <div className="flex flex-wrap items-baseline gap-6 pt-2">
              <PriceDisplay price={12500} pricingMode="retail" size="sm" />
              <PriceDisplay price={38500} comparePrice={44000} pricingMode="both" />
              <PriceDisplay price={1915420} pricingMode="retail" size="lg" />
            </div>
            <PriceDisplay pricingMode="quote" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

## `client/src/app/style-guide/sections/data-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Breadcrumb, Pagination } from '@/components/ui/pagination';
import { DataTable, type Column } from '@/components/ui/table';
import { Badge, StockBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import { mockProducts } from '@/lib/mock-data';
import { formatPKR } from '@/lib/utils';

interface Row extends Record<string, unknown> {
  sku: string;
  name: string;
  brand: string;
  stock: string;
  price: string;
}

const rows: Row[] = mockProducts.slice(0, 5).map((product) => ({
  sku: product.sku,
  name: product.name,
  brand: product.brand,
  stock: product.stockStatus,
  price: product.price ? formatPKR(product.price) : 'On request',
}));

const columns: Column<Row>[] = [
  { key: 'sku', header: 'SKU', sortable: true },
  { key: 'name', header: 'Product', sortable: true },
  { key: 'brand', header: 'Brand', sortable: true },
  {
    key: 'stock',
    header: 'Stock',
    align: 'center',
    render: (row) => <StockBadge status={row.stock as 'in_stock'} />,
  },
  { key: 'price', header: 'Price', sortable: true, align: 'right' },
];

export function DataSection(): JSX.Element {
  const [page, setPage] = useState(4);

  return (
    <section id="data" className="scroll-mt-24">
      <SectionHeading title="Data display" />

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Cards</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card interactive>
              <CardHeader>
                <CardTitle>Interactive card</CardTitle>
                <CardDescription>Lifts on hover — used for product tiles.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Body content sits here with the standard 20 px padding.
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="cta">
                  Action
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Static card</CardTitle>
                <CardDescription>No hover treatment.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Used for panels and form sections.
              </CardContent>
            </Card>

            <Card className="bg-brand-gradient border-0 text-white">
              <CardHeader>
                <CardTitle className="text-white">Gradient panel</CardTitle>
                <CardDescription className="text-white/70">
                  #0F1B4C → #1B2A6B, for promos and CTAs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Sortable table
          </p>
          <DataTable columns={columns} rows={rows} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-6">
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Tabs</p>
            <Tabs defaultValue="specs">
              <TabsList>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="datasheet">Datasheet</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>
              <TabsContent value="specs">
                <dl className="divide-y divide-border text-sm">
                  {[
                    ['Rated Current (In)', '100 A'],
                    ['Poles', '3P'],
                    ['Breaking Capacity', '36 kA'],
                  ].map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 py-2">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </TabsContent>
              <TabsContent value="datasheet" className="text-sm text-muted-foreground">
                PDF datasheets are attached per product by the admin.
              </TabsContent>
              <TabsContent value="reviews" className="text-sm text-muted-foreground">
                Approved customer reviews appear here.
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-lg border border-border bg-white p-6">
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Accordion
            </p>
            <Accordion type="single" collapsible defaultValue="a">
              <AccordionItem value="a">
                <AccordionTrigger>Do you deliver outside Lahore?</AccordionTrigger>
                <AccordionContent>
                  Yes — Punjab in 2–4 working days and the rest of Pakistan in 3–6, with free
                  delivery above the thresholds set in Settings.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Can I get trade pricing?</AccordionTrigger>
                <AccordionContent>
                  Add items to your inquiry list and send the request — we reply with a
                  consolidated quotation within one working day.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="c">
                <AccordionTrigger>Are the brands genuine?</AccordionTrigger>
                <AccordionContent>
                  We are an authorised stockist for all twelve brands listed in the footer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <div className="space-y-5 rounded-lg border border-border bg-white p-6">
          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Breadcrumb
            </p>
            <Breadcrumb
              items={[
                { label: 'Switchgear & Protection', href: '/category/switchgear-protection' },
                { label: 'Circuit Breakers', href: '/category/circuit-breakers' },
                { label: 'MCCB' },
              ]}
            />
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Pagination
            </p>
            <Pagination page={page} totalPages={12} onPageChange={setPage} className="justify-start" />
            <p className="mt-2 text-xs text-muted-foreground">
              Current page: <Badge variant="outline">{page}</Badge> of 12
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## `client/src/app/style-guide/sections/feedback-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Info, PackageSearch } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  SheetContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/tooltip';
import {
  EmptyState,
  ErrorState,
  ProductCardSkeleton,
  Skeleton,
  Spinner,
  TableSkeleton,
} from '@/components/ui/feedback';
import { SectionHeading } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';

export function FeedbackSection(): JSX.Element {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section id="feedback" className="scroll-mt-24">
      <SectionHeading title="Feedback & overlays" />

      <div className="space-y-8">
        <div className="grid gap-3 lg:grid-cols-2">
          <Alert variant="info" title="Price on request">
            This item is quote-only. Add it to your inquiry list and we will price it for you.
          </Alert>
          <Alert variant="success" title="Order confirmed">
            Order FT-202607-0042 has been placed. A confirmation email is on its way.
          </Alert>
          <Alert variant="warning" title="Only 3 left in stock">
            Order soon, or request a quote for a larger quantity.
          </Alert>
          <Alert variant="danger" title="Payment failed">
            We could not take the payment. Please try another method or pay on delivery.
          </Alert>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Toasts, tooltips and menus
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => toast.success('Added to cart', { description: '2 × Schneider LC1D18M7' })}>
              Success toast
            </Button>
            <Button variant="outline" onClick={() => toast.error('Out of stock', { description: 'Only 3 remaining.' })}>
              Error toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast('Quotation sent', {
                  description: 'FTQ-202607-0017 emailed to the customer.',
                  action: { label: 'View', onClick: () => undefined },
                })
              }
            >
              Toast with action
            </Button>

            <Tooltip content="Trade buyers can paste a part number here">
              <Button variant="ghost">
                <Info />
                Hover me
              </Button>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuItem>Newest first</DropdownMenuItem>
                <DropdownMenuItem>Price: low to high</DropdownMenuItem>
                <DropdownMenuItem>Best selling</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Reset</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="primary">Open modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a bulk price</DialogTitle>
                  <DialogDescription>
                    Send us the quantity you need and we will come back with a trade price within
                    one working day.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button variant="cta">Send request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
              <Button variant="outline" onClick={() => setSheetOpen(true)}>
                Open drawer
              </Button>
              <SheetContent side="right">
                <div className="border-b border-border p-5">
                  <DialogTitle>Your cart</DialogTitle>
                </div>
                <div className="flex-1 p-5 text-sm text-muted-foreground">
                  The cart drawer uses the same primitive as the mobile menu — one Radix root,
                  two presentations.
                </div>
                <div className="border-t border-border p-5">
                  <Button variant="cta" block>
                    Checkout
                  </Button>
                </div>
              </SheetContent>
            </Dialog>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Loading states
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProductCardSkeleton />
            <div className="space-y-3 rounded-lg border border-border bg-white p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <TableSkeleton rows={4} />
            </div>
            <div className="flex items-center justify-center rounded-lg border border-border bg-white p-4">
              <Spinner />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title="No products match those filters"
            description="Try widening the price range or clearing a brand filter."
            icon={<PackageSearch />}
            action={<Button variant="outline" size="sm">Clear all filters</Button>}
          />
          <ErrorState onRetry={() => toast('Retrying…')} />
        </div>
      </div>
    </section>
  );
}
```

## `client/src/app/style-guide/sections/forms-section.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Checkbox, RadioGroup, RadioGroupItem, Switch } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { PriceRangeSlider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeading } from '@/components/ui/separator';

export function FormsSection(): JSX.Element {
  const [range, setRange] = useState<[number, number]>([5000, 90000]);
  const [poles, setPoles] = useState('3p');

  return (
    <section id="forms" className="scroll-mt-24">
      <SectionHeading title="Form controls" description="Every control is keyboard-navigable and carries a visible focus ring at WCAG AA contrast." />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-lg border border-border bg-white p-6">
          <Field label="Full name" htmlFor="sg-name" required>
            <Input id="sg-name" placeholder="Muhammad Imran" />
          </Field>

          <Field label="Search" htmlFor="sg-search" hint="Prefix-matches SKU and part number.">
            <Input id="sg-search" placeholder="SCH-CVS100F" leadingIcon={<Search />} />
          </Field>

          <Field label="Email" htmlFor="sg-email" error="Enter a valid email address">
            <Input id="sg-email" defaultValue="not-an-email" hasError />
          </Field>

          <Field label="Category" htmlFor="sg-cat">
            <Select defaultValue="mccb">
              <SelectTrigger id="sg-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcb">MCB</SelectItem>
                <SelectItem value="mccb">MCCB</SelectItem>
                <SelectItem value="acb">ACB</SelectItem>
                <SelectItem value="rccb">RCCB &amp; ELCB</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Requirements" htmlFor="sg-note" hint="Rating, poles, breaking capacity, quantity.">
            <Textarea id="sg-note" placeholder="Need 6 × 250A 3P MCCB, 36kA, for a new LT panel…" />
          </Field>

          <Field label="Disabled" htmlFor="sg-disabled">
            <Input id="sg-disabled" disabled defaultValue="Read only" />
          </Field>
        </div>

        <div className="space-y-6 rounded-lg border border-border bg-white p-6">
          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Checkboxes
            </p>
            <div className="space-y-2.5">
              {['In stock only', 'Featured products', 'Has datasheet'].map((label, index) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Checkbox id={`sg-cb-${index}`} defaultChecked={index === 0} />
                  <Label htmlFor={`sg-cb-${index}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
              <div className="flex items-center gap-2.5">
                <Checkbox id="sg-cb-ind" checked="indeterminate" />
                <Label htmlFor="sg-cb-ind" className="font-normal">
                  Indeterminate
                </Label>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Radio group — poles
            </p>
            <RadioGroup value={poles} onValueChange={setPoles}>
              {[
                { value: '1p', label: '1 Pole' },
                { value: '3p', label: '3 Pole' },
                { value: '4p', label: '4 Pole' },
              ].map((option) => (
                <div key={option.value} className="flex items-center gap-2.5">
                  <RadioGroupItem value={option.value} id={`sg-r-${option.value}`} />
                  <Label htmlFor={`sg-r-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Switches
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sg-sw1" className="font-normal">
                  Show quote-only products
                </Label>
                <Switch id="sg-sw1" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sg-sw2" className="font-normal">
                  Email me price changes
                </Label>
                <Switch id="sg-sw2" />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
              Price range
            </p>
            <PriceRangeSlider min={0} max={200000} value={range} onValueChange={setRange} />
          </div>
        </div>
      </div>
    </section>
  );
}
```

## `client/src/app/style-guide/sections/tokens-section.tsx`

```tsx
import { SectionHeading } from '@/components/ui/separator';

/** Colour, typography, radius and shadow tokens. */

const COLOURS = [
  { name: 'brand-navy', hex: '#1B2A6B', className: 'bg-brand-navy', note: 'Primary' },
  { name: 'brand-cyan', hex: '#00AEEF', className: 'bg-brand-cyan', note: 'Accent / CTA' },
  { name: 'brand-dark', hex: '#0F1B4C', className: 'bg-brand-dark', note: 'Gradient start' },
  { name: 'surface', hex: '#F7F9FC', className: 'bg-surface border border-border', note: 'Page background' },
  { name: 'foreground', hex: '#1A1A1A', className: 'bg-foreground', note: 'Body text' },
  { name: 'muted-foreground', hex: '#5A6472', className: 'bg-muted-foreground', note: 'Secondary text' },
  { name: 'success', hex: 'hsl(152 62% 34%)', className: 'bg-success', note: 'In stock' },
  { name: 'warning', hex: 'hsl(38 92% 45%)', className: 'bg-warning', note: 'Low stock' },
  { name: 'destructive', hex: 'hsl(0 72% 45%)', className: 'bg-destructive', note: 'Errors' },
];

export function TokensSection(): JSX.Element {
  return (
    <section id="tokens" className="scroll-mt-24">
      <SectionHeading title="Design tokens" description="Every colour resolves through a CSS variable, so a dark theme is a variable swap rather than a rewrite." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {COLOURS.map((colour) => (
          <div key={colour.name} className="overflow-hidden rounded-lg border border-border bg-white">
            <div className={`h-16 ${colour.className}`} />
            <div className="p-3">
              <p className="text-xs font-bold text-brand-navy">{colour.name}</p>
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{colour.hex}</p>
              <p className="mt-1 text-2xs text-muted-foreground">{colour.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-4 text-2xs font-bold uppercase tracking-wide text-muted-foreground">Typography</p>
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight text-brand-navy">
            Heading 1 — Poppins
          </h1>
          <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy">Heading 2</h2>
          <h3 className="mt-3 font-heading text-lg font-bold text-brand-navy">Heading 3</h3>
          <p className="mt-4 text-sm text-foreground">
            Body copy is set in Inter at 14–16 px. It stays legible at small sizes on the cheap
            Android screens that make up most of this traffic.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Secondary text · 12 px · muted-foreground</p>
          <p className="mt-2 font-mono text-2xs text-muted-foreground">SKU SCH-CVS100F-3P100 · 11 px mono</p>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-4 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Radius &amp; elevation
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'shadow-soft', className: 'shadow-soft' },
              { label: 'shadow-card', className: 'shadow-card' },
              { label: 'shadow-card-hover', className: 'shadow-card-hover' },
              { label: 'shadow-panel', className: 'shadow-panel' },
            ].map((shadow) => (
              <div
                key={shadow.label}
                className={`flex h-20 items-center justify-center rounded-lg border border-border bg-white text-xs font-medium text-muted-foreground ${shadow.className}`}
              >
                {shadow.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Default radius is <code className="font-mono text-brand-navy">rounded-lg</code> (8 px).
            Container is capped at 1400 px.
          </p>
        </div>
      </div>
    </section>
  );
}
```

## `client/tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Fast Traders design system.
 *
 * All colours resolve through CSS variables declared in `src/app/globals.css`
 * so that shadcn/ui semantic tokens and the raw brand palette stay in sync and
 * a future dark theme is a variable swap rather than a config rewrite.
 *
 * Brand palette (source of truth):
 *   navy    #1B2A6B   cyan   #00AEEF
 *   dark    #0F1B4C   bg     #F7F9FC
 *   ink     #1A1A1A   muted  #5A6472
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      // Single max width at every breakpoint — the industrial-catalogue look
      // wants a wide, dense grid rather than a narrow reading column.
      screens: { sm: '1400px', md: '1400px', lg: '1400px', xl: '1400px', '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* ---------------- Brand palette ---------------- */
        brand: {
          navy: 'hsl(var(--brand-navy))',
          cyan: 'hsl(var(--brand-cyan))',
          dark: 'hsl(var(--brand-dark))',
          muted: 'hsl(var(--brand-muted))',
          ink: 'hsl(var(--brand-ink))',
          surface: 'hsl(var(--brand-surface))',
        },

        /* ------------- shadcn/ui semantic tokens ------------- */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
        'brand-gradient-r': 'linear-gradient(90deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
      },

      fontFamily: {
        /* Body copy */
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        /* Headings — industrial, tight, slightly uppercase-leaning */
        heading: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Technical UI needs a tight small size for spec tables / part numbers.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /* Soft, low-spread shadows — depth without the drop-shadow "app" look. */
      boxShadow: {
        soft: '0 1px 2px 0 rgb(27 42 107 / 0.05)',
        card: '0 1px 2px 0 rgb(27 42 107 / 0.04), 0 4px 16px -4px rgb(27 42 107 / 0.10)',
        'card-hover': '0 2px 4px 0 rgb(27 42 107 / 0.06), 0 12px 28px -6px rgb(27 42 107 / 0.16)',
        panel: '0 8px 40px -12px rgb(15 27 76 / 0.22)',
        focus: '0 0 0 3px hsl(var(--brand-cyan) / 0.35)',
      },
      maxWidth: { container: '1400px' },
      zIndex: { header: '50', drawer: '60', modal: '70', toast: '80' },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'slide-down': 'slide-down 0.18s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
```

## `client/src/lib/mock-data.ts`

```ts
import type { PricingMode, StockStatus } from '@/types';

/**
 * Mock data for Phase 5.
 * Shapes match the real API contract, so swapping in TanStack Query later is
 * a change of source, not a change of component.
 */

export interface MockCategory {
  name: string;
  slug: string;
  icon: string;
  children: { name: string; slug: string; children?: { name: string; slug: string }[] }[];
}

export const mockCategories: MockCategory[] = [
  {
    name: 'Switchgear & Protection',
    slug: 'switchgear-protection',
    icon: 'ShieldCheck',
    children: [
      {
        name: 'Circuit Breakers',
        slug: 'circuit-breakers',
        children: [
          { name: 'MCB', slug: 'mcb' },
          { name: 'MCCB', slug: 'mccb' },
          { name: 'ACB', slug: 'acb' },
          { name: 'RCCB & ELCB', slug: 'rccb-elcb' },
        ],
      },
      { name: 'Distribution Boards & Panels', slug: 'distribution-boards-panels' },
      { name: 'Busbars & Enclosures', slug: 'busbars-enclosures' },
    ],
  },
  {
    name: 'Control & Automation',
    slug: 'control-automation',
    icon: 'Cpu',
    children: [
      { name: 'PLCs & HMIs', slug: 'plcs-hmis' },
      { name: 'VFDs & Drives', slug: 'vfds-drives' },
      {
        name: 'Sensors',
        slug: 'sensors',
        children: [
          { name: 'Proximity Sensors', slug: 'proximity-sensors' },
          { name: 'Photoelectric Sensors', slug: 'photoelectric-sensors' },
        ],
      },
      { name: 'Encoders', slug: 'encoders' },
      { name: 'Timers & Counters', slug: 'timers-counters' },
      { name: 'Temperature Controllers', slug: 'temperature-controllers' },
    ],
  },
  {
    name: 'Control Components',
    slug: 'control-components',
    icon: 'ToggleLeft',
    children: [
      { name: 'Contactors & Relays', slug: 'contactors-relays' },
      { name: 'Push Buttons & Indicators', slug: 'push-buttons-indicators' },
      { name: 'Switches', slug: 'switches' },
      { name: 'Terminal Blocks & Connectors', slug: 'terminal-blocks-connectors' },
    ],
  },
  {
    name: 'Cables & Wiring',
    slug: 'cables-wiring',
    icon: 'Cable',
    children: [
      { name: 'Power Cables', slug: 'power-cables' },
      { name: 'Control & Instrumentation Cables', slug: 'control-instrumentation-cables' },
      { name: 'Building Wire', slug: 'building-wire' },
    ],
  },
  {
    name: 'Power & Motors',
    slug: 'power-motors',
    icon: 'BatteryCharging',
    children: [
      { name: 'Power Supplies', slug: 'power-supplies' },
      { name: 'Transformers', slug: 'transformers' },
      { name: 'Capacitors', slug: 'capacitors' },
      { name: 'Motors & Starters', slug: 'motors-starters' },
    ],
  },
  {
    name: 'Safety Products',
    slug: 'safety-products',
    icon: 'ShieldAlert',
    children: [
      { name: 'Safety Relays', slug: 'safety-relays' },
      { name: 'Safety Switches', slug: 'safety-switches' },
    ],
  },
  { name: 'Tools & Accessories', slug: 'tools-accessories', icon: 'Wrench', children: [] },
];

export interface MockBrand {
  name: string;
  slug: string;
  country: string;
}

export const mockBrands: MockBrand[] = [
  { name: 'Terasaki', slug: 'terasaki', country: 'Japan' },
  { name: 'Mitsubishi Electric', slug: 'mitsubishi-electric', country: 'Japan' },
  { name: 'Schneider Electric', slug: 'schneider-electric', country: 'France' },
  { name: 'Fuji Electric', slug: 'fuji-electric', country: 'Japan' },
  { name: 'Hager', slug: 'hager', country: 'Germany' },
  { name: 'Autonics', slug: 'autonics', country: 'South Korea' },
  { name: 'IDEC', slug: 'idec', country: 'Japan' },
  { name: 'Pilz', slug: 'pilz', country: 'Germany' },
  { name: 'WAGO', slug: 'wago', country: 'Germany' },
  { name: 'National', slug: 'national', country: 'Pakistan' },
  { name: 'DELAB', slug: 'delab', country: 'Turkey' },
  { name: 'Torex', slug: 'torex', country: 'Pakistan' },
];

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  pricingMode: PricingMode;
  price?: number;
  comparePrice?: number;
  stockStatus: StockStatus;
  unit: string;
  image: string;
  ratingAvg: number;
  reviewCount: number;
  isFeatured?: boolean;
}

const placeholder = (sku: string): string =>
  `https://placehold.co/600x600/F7F9FC/1B2A6B/png?text=${encodeURIComponent(sku)}`;

export const mockProducts: MockProduct[] = [
  {
    id: '1', name: 'Schneider EasyPact CVS100F 3P 100A MCCB 36kA',
    slug: 'schneider-easypact-cvs100f-3p-100a-mccb', sku: 'SCH-CVS100F-3P100',
    brand: 'Schneider Electric', category: 'MCCB', pricingMode: 'both',
    price: 38500, comparePrice: 44000, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('SCH-CVS100F'), ratingAvg: 4.6, reviewCount: 12, isFeatured: true,
  },
  {
    id: '2', name: 'Terasaki TemBreak 2 S250-NJ 3P 250A MCCB',
    slug: 'terasaki-tembreak-2-s250-nj-3p-250a-mccb', sku: 'TER-S250NJ-3P250',
    brand: 'Terasaki', category: 'MCCB', pricingMode: 'quote',
    stockStatus: 'low_stock', unit: 'piece',
    image: placeholder('TER-S250NJ'), ratingAvg: 4.8, reviewCount: 5, isFeatured: true,
  },
  {
    id: '3', name: 'Schneider TeSys LC1D18M7 Contactor 18A 3P 220VAC',
    slug: 'schneider-tesys-lc1d18m7-contactor-18a', sku: 'SCH-LC1D18M7',
    brand: 'Schneider Electric', category: 'Contactors', pricingMode: 'retail',
    price: 8900, comparePrice: 10200, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('SCH-LC1D18M7'), ratingAvg: 4.7, reviewCount: 31,
  },
  {
    id: '4', name: 'Autonics PRCM18-8DN Proximity Sensor M18 PNP NO',
    slug: 'autonics-prcm18-8dn-proximity-sensor', sku: 'AUT-PRCM18-8DN',
    brand: 'Autonics', category: 'Proximity Sensors', pricingMode: 'retail',
    price: 3200, comparePrice: 3800, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('AUT-PRCM18'), ratingAvg: 4.5, reviewCount: 24,
  },
  {
    id: '5', name: 'Mitsubishi MELSEC iQ-F FX5U-32MT/ES PLC',
    slug: 'mitsubishi-melsec-iq-f-fx5u-32mt-es-plc', sku: 'MIT-FX5U-32MTES',
    brand: 'Mitsubishi Electric', category: 'PLCs & HMIs', pricingMode: 'quote',
    stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('MIT-FX5U'), ratingAvg: 4.9, reviewCount: 8, isFeatured: true,
  },
  {
    id: '6', name: 'Torex 3-Core 2.5mm² PVC Copper Cable (100m Roll)',
    slug: 'torex-3-core-2-5mm-pvc-copper-cable-100m', sku: 'TOR-CAB-3C25-100',
    brand: 'Torex', category: 'Power Cables', pricingMode: 'retail',
    price: 46500, comparePrice: 52000, stockStatus: 'in_stock', unit: 'roll',
    image: placeholder('TOR-CAB-3C25'), ratingAvg: 4.4, reviewCount: 17,
  },
  {
    id: '7', name: 'Pilz PNOZ X2.8P Safety Relay 24V AC/DC',
    slug: 'pilz-pnoz-x2-8p-safety-relay', sku: 'PIL-PNOZX28P',
    brand: 'Pilz', category: 'Safety Relays', pricingMode: 'quote',
    stockStatus: 'on_order', unit: 'piece',
    image: placeholder('PIL-PNOZX28P'), ratingAvg: 5, reviewCount: 3,
  },
  {
    id: '8', name: 'WAGO 221-413 Lever Splicing Connector 3-Way (Box of 50)',
    slug: 'wago-221-413-lever-splicing-connector-3-way', sku: 'WAG-221413-B50',
    brand: 'WAGO', category: 'Terminal Blocks', pricingMode: 'retail',
    price: 4300, comparePrice: 4900, stockStatus: 'out_of_stock', unit: 'box',
    image: placeholder('WAG-221413'), ratingAvg: 4.8, reviewCount: 46,
  },
];

/** Prefix search over the mock catalogue, mimicking `/search/suggest`. */
export function mockSuggest(term: string, limit = 6): MockProduct[] {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];

  return mockProducts
    .filter(
      (product) =>
        product.sku.toLowerCase().includes(needle) ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/** Flat category list for the search bar's scope dropdown. */
export const mockSearchScopes = [
  { label: 'All categories', value: 'all' },
  ...mockCategories.map((category) => ({ label: category.name, value: category.slug })),
];
```

## `client/src/lib/auth-context.tsx`

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';

/**
 * Authentication context.
 *
 * Phase 5 ships the shape and the hook only — no requests. Phase 6 replaces
 * the placeholder state with a TanStack Query call to `GET /auth/me`, so
 * consumers written now will not need to change.
 */

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isStaff: boolean;
  setUser: (user: User | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}): JSX.Element {
  const [user, setUser] = useState<User | null>(initialUser);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      // Phase 5 never loads, so this is always false; Phase 6 wires it to the query.
      isLoading: false,
      isStaff: user?.role === 'admin' || user?.role === 'manager',
      setUser,
      signOut,
    }),
    [user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
```

## `client/src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Pakistani Rupees — "Rs. 12,500".
 *
 * The symbol is composed manually rather than via `style: 'currency'`:
 * ICU renders PKR as "Rs" (no full stop) under full ICU and as "PKR" under
 * Node's small-icu build, so a currency-formatted string would differ between
 * the server render and the browser and trip a hydration mismatch.
 */
export function formatPKR(amount: number, options?: { withDecimals?: boolean }): string {
  const withDecimals = options?.withDecimals ?? false;
  const digits = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);

  return `Rs. ${digits}`;
}

/** Format an ISO date string for display (e.g. "12 Mar 2026"). */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Convert an arbitrary string into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Truncate text to `max` characters, appending an ellipsis when cut. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Build a wa.me deep link with an optional pre-filled message. */
export function whatsappLink(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Type-safe "this should never happen" guard for exhaustive switches. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
```
