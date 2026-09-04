import { Clock } from 'lucide-react';
import { AVAILABILITY_LABELS } from '@/lib/availability';
import { cn } from '@/lib/utils';
import type { Availability } from '@/types';

/**
 * What a buyer is told instead of a stock count.
 *
 * The four states answer the only question being asked: can I collect it
 * today, will you order it in, are you importing it, or is it gone. A number
 * on the shelf is staff data and, for an importer, usually out of date by the
 * time anyone reads it.
 *
 * `discontinued` is grey and deliberately unalarming — it is information, not
 * an error, and the product page still shows it because people search for
 * obsolete part numbers looking for a replacement.
 */

/* Wording comes from `@/lib/availability` so the badge and the catalogue
   filter cannot drift into saying two different things about one state. */
const STYLES: Record<Availability, { className: string; dot: string }> = {
  ready_stock: {
    className: 'border-success/30 bg-success/10 text-success-foreground',
    dot: 'bg-success',
  },
  available_on_order: {
    className: 'border-warning/40 bg-warning/10 text-warning-foreground',
    dot: 'bg-warning',
  },
  import_on_request: {
    className: 'border-brand-cyan/40 bg-brand-cyan/10 text-brand-navy',
    dot: 'bg-brand-cyan',
  },
  discontinued: {
    className: 'border-border bg-surface text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

export interface AvailabilityBadgeProps {
  value: Availability;
  /** e.g. "2-3 days" or "3-4 weeks (imported)". Rendered under the badge. */
  leadTime?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function AvailabilityBadge({
  value,
  leadTime,
  size = 'md',
  className,
}: AvailabilityBadgeProps): JSX.Element {
  // Both records cover the union exhaustively; the fallbacks satisfy
  // `noUncheckedIndexedAccess` for a value arriving from an untyped API.
  const style = STYLES[value] ?? STYLES.available_on_order;
  const label = AVAILABILITY_LABELS[value] ?? AVAILABILITY_LABELS.available_on_order;

  return (
    <span className={cn('inline-flex flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded-full border font-medium',
          size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs',
          style.className,
        )}
      >
        {/* A dot as well as the colour: colour alone fails WCAG 1.4.1. */}
        <span className={cn('size-1.5 shrink-0 rounded-full', style.dot)} aria-hidden />
        {label}
      </span>

      {leadTime ? (
        <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
          <Clock className="size-3 shrink-0" aria-hidden />
          {leadTime}
        </span>
      ) : null}
    </span>
  );
}
