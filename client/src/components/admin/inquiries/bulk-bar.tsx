'use client';

import { useState } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STATUS_LABELS } from './status';
import { PIPELINE_ORDER } from './status-tabs';
import type { InquiryStatus } from '@/types';

/**
 * Bulk actions on the selected rows.
 *
 * Appears only when something is selected, so it costs nothing the rest of the
 * time. The two operations staff actually do in bulk are handing a batch to
 * somebody and moving a batch of dead leads to `no_response` at the end of a
 * week.
 *
 * `lost` is deliberately absent from the bulk status list: the API requires a
 * reason for it, and a reason typed once for twenty different inquiries is not
 * a reason. Those get marked individually, on the detail screen.
 */

const BULK_STATUSES = PIPELINE_ORDER.filter((status) => status !== 'lost');

export function BulkBar({
  count,
  staff,
  isSaving,
  onAssign,
  onStatus,
  onClear,
}: {
  count: number;
  staff: { id: string; name: string }[];
  isSaving: boolean;
  onAssign: (userId: string | null) => void;
  onStatus: (status: InquiryStatus) => void;
  onClear: () => void;
}): JSX.Element | null {
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');

  if (count === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 p-3">
      <span className="text-sm font-semibold text-brand-navy">
        {count} selected
      </span>

      <div className="flex items-center gap-2">
        <Select
          value={assignee}
          onValueChange={(value) => {
            setAssignee(value);
            onAssign(value === 'unassign' ? null : value);
          }}
        >
          <SelectTrigger className="h-9 w-[170px]" aria-label="Assign selected to">
            <SelectValue placeholder="Assign to…" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
            <SelectItem value="unassign">Unassign</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            onStatus(value as InquiryStatus);
          }}
        >
          <SelectTrigger className="h-9 w-[180px]" aria-label="Set status of selected">
            <SelectValue placeholder="Set status…" />
          </SelectTrigger>
          <SelectContent>
            {BULK_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isSaving ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserPlus className="size-3.5 animate-pulse" aria-hidden />
          Applying…
        </span>
      ) : null}

      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
        <X />
        Clear
      </Button>

      <span className="sr-only" role="status">
        {isSaving ? 'Applying bulk change' : `${count} inquiries selected`}
      </span>
      <Check className="hidden" aria-hidden />
    </div>
  );
}
