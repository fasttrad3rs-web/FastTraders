import type { AdminInquiry } from '@/lib/api/inquiries';

/**
 * Has this inquiry been sitting untouched too long?
 *
 * The rule the shop actually cares about: still `new` — nobody has picked up
 * the phone — and older than a working day. A `contacted` inquiry that has not
 * moved in a week is a different problem, tracked by the follow-up date rather
 * than by this.
 *
 * Deliberately not "created more than 24h ago". An inquiry that arrives at
 * 6pm Saturday is not neglected at 6pm Sunday; the counter was shut. Only
 * hours the shop was open count, so Sunday is skipped entirely.
 */

export const OVERDUE_AFTER_HOURS = 24;

/** Sunday is closed. Monday–Saturday all count as working days. */
const isClosed = (date: Date): boolean => date.getDay() === 0;

/**
 * Hours between two instants, ignoring any whole closed day in between.
 *
 * Coarse by design: it walks day boundaries rather than modelling opening
 * times to the minute. The question is "has this been ignored?", and an hour
 * either way does not change the answer.
 */
export function openHoursSince(from: Date, to: Date = new Date()): number {
  if (to <= from) return 0;

  const MS_PER_HOUR = 3_600_000;
  let closedDays = 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  // Count whole closed days strictly between the two dates.
  while (cursor < to) {
    if (isClosed(cursor)) closedDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  const elapsed = (to.getTime() - from.getTime()) / MS_PER_HOUR;
  return Math.max(0, elapsed - closedDays * 24);
}

export function isOverdue(inquiry: Pick<AdminInquiry, 'status' | 'createdAt'>): boolean {
  if (inquiry.status !== 'new') return false;
  return openHoursSince(new Date(inquiry.createdAt)) > OVERDUE_AFTER_HOURS;
}

/** "3h", "2d" — for the relative column, short enough for a table cell. */
export function shortAge(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;
}
