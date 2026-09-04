'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { STATUS_LABELS } from './status';
import type { AdminInquiry, InquiryPatch } from '@/lib/api/inquiries';
import type { InquiryPriority, InquiryStatus } from '@/types';

/**
 * The working panel: status, priority, what was quoted, and why it was lost.
 *
 * Marking an inquiry lost needs a reason. The API refuses without one, so the
 * panel refuses first — a validation error arriving after the dropdown has
 * already moved is a confusing way to learn the rule.
 */
export function ActionPanel({
  inquiry,
  onPatch,
}: {
  inquiry: AdminInquiry;
  onPatch: (patch: InquiryPatch) => void;
}): JSX.Element {
  const [quoted, setQuoted] = useState('');
  const [lostReason, setLostReason] = useState(inquiry.lostReason ?? '');

  return (
    <aside className="h-fit space-y-4 lg:sticky lg:top-24">
      <Card className="space-y-4 p-5">
        <Field label="Status" htmlFor="status">
          <Select
            value={inquiry.status}
            onValueChange={(value) => {
              if (value === 'lost' && !lostReason.trim()) {
                toast.error('Say why it was lost first', {
                  description: 'An unexplained loss teaches nobody anything.',
                });
                return;
              }
              onPatch({
                status: value as InquiryStatus,
                ...(value === 'lost' ? { lostReason } : {}),
              });
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority" htmlFor="priority">
          <Select
            value={inquiry.priority}
            onValueChange={(value) => onPatch({ priority: value as InquiryPriority })}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Quoted amount (Rs.)"
          htmlFor="quoted"
          hint="What you said on the phone. Internal — the pipeline totals this."
        >
          <div className="flex gap-2">
            <Input
              id="quoted"
              type="number"
              min={0}
              placeholder={inquiry.internalQuotedAmount?.toString() ?? ''}
              value={quoted}
              onChange={(event) => setQuoted(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={quoted === ''}
              onClick={() => {
                onPatch({ internalQuotedAmount: Number(quoted) });
                setQuoted('');
              }}
            >
              Save
            </Button>
          </div>
        </Field>

        <Field label="Lost reason" htmlFor="lost-reason" hint="Required before marking lost.">
          <Textarea
            id="lost-reason"
            rows={2}
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="e.g. Price — went to a Karachi supplier"
          />
        </Field>
      </Card>
    </aside>
  );
}
