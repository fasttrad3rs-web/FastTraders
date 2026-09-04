'use client';

import * as React from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

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
 * Availability label.
 *
 * Replaces `PriceDisplay`. Fast Traders publishes no prices, so the slot where
 * a price would sit carries the call to action instead — "Price on request"
 * next to a phone number converts better than a blank space.
 */
export function AvailabilityNote({
  isMadeToOrder,
  size = 'md',
  className,
}: {
  isMadeToOrder?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}): JSX.Element {
  const scale = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }[size];

  return (
    <div className={cn('space-y-0.5', className)}>
      <span className={cn('block font-heading font-bold text-brand-cyan', scale)}>
        Price on request
      </span>
      <span className="block text-2xs text-muted-foreground">
        {isMadeToOrder
          ? 'Sourced to order — we will confirm price and lead time'
          : 'Call, WhatsApp or send an enquiry for a quotation'}
      </span>
    </div>
  );
}
