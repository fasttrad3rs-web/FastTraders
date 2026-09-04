'use client';

import { useState } from 'react';
import { CalendarClock, MessageSquarePlus, StickyNote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import type { AdminFollowUp, AdminInquiry } from '@/lib/api/inquiries';

/**
 * The internal thread: what was said, by whom, and when to chase again.
 *
 * Append-only on purpose. This is the record of what the shop told a customer
 * on the phone, and a note that can be quietly edited afterwards is worth
 * nothing in the argument it exists to settle.
 *
 * Newest first, because the question being asked is almost always "where did
 * we leave this?" rather than "how did it begin".
 */

/** `2026-07-31` in the input's required format, for the min attribute. */
const today = (): string => new Date().toISOString().slice(0, 10);

function author(entry: AdminFollowUp): string {
  if (typeof entry.by === 'string') return 'Staff';
  return entry.by?.name ?? 'Staff';
}

export function FollowUps({
  inquiry,
  onAdd,
  isSaving,
}: {
  inquiry: AdminInquiry;
  onAdd: (body: { note: string; nextFollowUpAt?: string }) => void;
  isSaving: boolean;
}): JSX.Element {
  const [note, setNote] = useState('');
  const [nextAt, setNextAt] = useState('');

  // Newest first without mutating the prop — `reverse()` in place would
  // reorder React Query's cache and make the list flicker on refetch.
  const entries = [...inquiry.followUps].reverse();

  const submit = (): void => {
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      toast.error('Write what happened first', {
        description: 'Even "left a voicemail" is worth more than an empty entry.',
      });
      return;
    }

    onAdd({ note: trimmed, ...(nextAt ? { nextFollowUpAt: nextAt } : {}) });
    setNote('');
    setNextAt('');
  };

  return (
    <Card className="space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        <StickyNote className="size-4 text-brand-cyan" aria-hidden />
        Internal notes
        {entries.length > 0 ? (
          <span className="font-sans text-2xs font-normal normal-case text-muted-foreground">
            {entries.length}
          </span>
        ) : null}
      </h2>

      <div className="space-y-3 rounded-lg bg-surface p-3">
        <Field label="What happened?" htmlFor="follow-up-note">
          <Textarea
            id="follow-up-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Called — asked for 3P 250A instead. Quoting Terasaki, will confirm tomorrow."
          />
        </Field>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Chase again on" htmlFor="follow-up-date" className="flex-1">
            <Input
              id="follow-up-date"
              type="date"
              min={today()}
              value={nextAt}
              onChange={(event) => setNextAt(event.target.value)}
            />
          </Field>

          <Button type="button" variant="cta" onClick={submit} isLoading={isSaving}>
            <MessageSquarePlus />
            Add note
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing recorded yet. The first note is usually the call that was not answered.
        </p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry, index) => (
            <li
              // Follow-ups have no id of their own — they are a subdocument
              // array, and the timestamp plus position is stable enough.
              // eslint-disable-next-line react/no-array-index-key -- append-only list
              key={`${entry.at}-${index}`}
              className="border-l-2 border-brand-cyan/40 pl-3"
            >
              <p className="whitespace-pre-wrap text-sm text-foreground">{entry.note}</p>

              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                <span className="font-medium text-brand-navy">{author(entry)}</span>
                <span>{formatDate(entry.at)}</span>

                {entry.nextFollowUpAt ? (
                  <span className="inline-flex items-center gap-1 rounded bg-brand-cyan/10 px-1.5 py-0.5 font-medium text-brand-navy">
                    <CalendarClock className="size-3" aria-hidden />
                    chase {formatDate(entry.nextFollowUpAt)}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
