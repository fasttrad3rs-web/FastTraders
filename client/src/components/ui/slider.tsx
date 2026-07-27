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
