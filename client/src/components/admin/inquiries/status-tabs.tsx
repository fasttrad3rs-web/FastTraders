'use client';

import { STATUS_LABELS } from './status';
import { cn } from '@/lib/utils';
import type { InquiryStatus } from '@/types';

/**
 * The pipeline as a row of tabs.
 *
 * Ordered the way the work flows — new, contacted, quoted, negotiating, then
 * the three endings — rather than alphabetically. Somebody scanning this is
 * asking "what needs me next?", and the answer is almost always leftmost.
 *
 * Counts come from the dashboard's `byStatus` map, which the API already
 * computes. A tab with nothing behind it still shows, so the shape of the
 * pipeline stays constant and staff learn where things are.
 */

export const PIPELINE_ORDER: InquiryStatus[] = [
  'new',
  'contacted',
  'quoted_verbally',
  'negotiating',
  'won',
  'lost',
  'no_response',
];

export const ALL_TAB = 'all';

export function StatusTabs({
  value,
  counts,
  total,
  onChange,
}: {
  value: string;
  /** Keyed by status, as `byStatus` returns it. Missing means zero. */
  counts: Record<string, number>;
  total: number;
  onChange: (next: string) => void;
}): JSX.Element {
  const tabs: { key: string; label: string; count: number }[] = [
    { key: ALL_TAB, label: 'All', count: total },
    ...PIPELINE_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status] ?? 0,
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="mb-4 flex gap-1 overflow-x-auto border-b border-border pb-px"
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-brand-cyan text-brand-navy'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-brand-navy',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums',
                active ? 'bg-brand-cyan text-white' : 'bg-surface text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
