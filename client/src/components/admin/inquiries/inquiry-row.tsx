'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, Phone } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { PriorityBadge, StatusBadge, TYPE_LABELS } from './status';
import { isOverdue, shortAge } from './overdue';
import { cn } from '@/lib/utils';
import type { AdminInquiry } from '@/lib/api/inquiries';
import type { InquiryPriority, InquiryStatus, InquiryType } from '@/types';

/**
 * One line of the pipeline.
 *
 * A row goes red when it is still `new` past a working day. That is not
 * decoration: an unanswered inquiry is the only failure state this business
 * has, and it is invisible unless something shouts. See `overdue.ts` for why
 * Sunday does not count towards it.
 */

/** The next chase date, taken from the most recent follow-up that set one. */
function nextChase(inquiry: AdminInquiry): string | undefined {
  for (let i = inquiry.followUps.length - 1; i >= 0; i -= 1) {
    const at = inquiry.followUps[i]?.nextFollowUpAt;
    if (at) return at;
  }
  return undefined;
}

function assignee(inquiry: AdminInquiry): string {
  if (!inquiry.assignedTo) return '—';
  return typeof inquiry.assignedTo === 'string' ? 'Assigned' : inquiry.assignedTo.name;
}

export function InquiryRow({
  inquiry,
  selected,
  onSelect,
}: {
  inquiry: AdminInquiry;
  selected: boolean;
  onSelect: (id: string, next: boolean) => void;
}): JSX.Element {
  const overdue = isOverdue(inquiry);
  const chase = nextChase(inquiry);
  const chaseDue = chase ? new Date(chase) <= new Date() : false;

  return (
    <TableRow className={cn(overdue && 'bg-destructive/5 hover:bg-destructive/10')}>
      <TableCell className="w-8">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(inquiry.id, checked === true)}
          aria-label={`Select ${inquiry.inquiryNumber}`}
        />
      </TableCell>

      <TableCell>
        <Link
          href={`/admin/inquiries/${inquiry.id}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
        >
          {overdue ? (
            <AlertTriangle
              className="size-3.5 shrink-0 text-destructive"
              aria-label="No contact for over a working day"
            />
          ) : null}
          {inquiry.inquiryNumber}
        </Link>
      </TableCell>

      <TableCell className="text-xs text-muted-foreground">
        {TYPE_LABELS[inquiry.type as InquiryType] ?? inquiry.type}
      </TableCell>

      <TableCell>
        <span className="block text-sm font-medium text-foreground">{inquiry.customer.name}</span>
        {inquiry.customer.company ? (
          <span className="block text-2xs text-muted-foreground">{inquiry.customer.company}</span>
        ) : null}
      </TableCell>

      <TableCell>
        {/* One tap to dial — this is a phone-first business. */}
        <a
          href={`tel:${inquiry.customer.phone}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-navy hover:text-brand-cyan"
        >
          <Phone className="size-3 shrink-0" aria-hidden />
          {inquiry.customer.phone}
        </a>
      </TableCell>

      <TableCell className="text-xs text-muted-foreground">
        {inquiry.customer.city ?? '—'}
      </TableCell>

      <TableCell className="text-center text-xs tabular-nums">
        {inquiry.items.length > 0 ? inquiry.items.length : '—'}
      </TableCell>

      <TableCell>
        <StatusBadge status={inquiry.status as InquiryStatus} />
      </TableCell>

      <TableCell>
        <PriorityBadge priority={inquiry.priority as InquiryPriority} />
      </TableCell>

      <TableCell className="text-xs text-muted-foreground">{assignee(inquiry)}</TableCell>

      <TableCell className="whitespace-nowrap text-2xs">
        {chase ? (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              chaseDue ? 'font-semibold text-destructive' : 'text-muted-foreground',
            )}
          >
            <CalendarClock className="size-3 shrink-0" aria-hidden />
            {new Date(chase).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell
        className={cn(
          'whitespace-nowrap text-right text-2xs tabular-nums',
          overdue ? 'font-semibold text-destructive' : 'text-muted-foreground',
        )}
        title={new Date(inquiry.createdAt).toLocaleString('en-GB')}
      >
        {shortAge(inquiry.createdAt)}
      </TableCell>
    </TableRow>
  );
}
