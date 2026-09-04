import { Badge } from '@/components/ui/badge';
import type { InquiryPriority, InquiryStatus, InquiryType } from '@/types';

/**
 * Pipeline vocabulary, in one place.
 *
 * The labels are the words Sharjeel would use on the phone, not the enum
 * values — "Quoted (verbally)" makes it obvious no document went out, which
 * is the single most important thing about this pipeline.
 */

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted_verbally: 'Quoted (verbally)',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
  no_response: 'No response',
};

const STATUS_VARIANT: Record<InquiryStatus, 'accent' | 'muted' | 'success' | 'warning' | 'danger'> =
  {
    new: 'accent',
    contacted: 'muted',
    quoted_verbally: 'warning',
    negotiating: 'warning',
    won: 'success',
    lost: 'danger',
    no_response: 'muted',
  };

export const TYPE_LABELS: Record<InquiryType, string> = {
  product_inquiry: 'Product',
  sourcing_request: 'Sourcing',
  general: 'General',
};

export const PRIORITY_LABELS: Record<InquiryPriority, string> = {
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export function StatusBadge({ status }: { status: InquiryStatus }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: InquiryPriority }): JSX.Element {
  if (priority === 'normal') return <span className="text-2xs text-muted-foreground">Normal</span>;

  return (
    <Badge variant={priority === 'high' ? 'danger' : 'muted'}>
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}
