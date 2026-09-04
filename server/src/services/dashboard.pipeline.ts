import { Inquiry } from '../models';

/**
 * The four pipeline signals the funnel dashboard needs and the base stats
 * could not answer: what is late, what is due, where the demand is, and what
 * people keep asking for that we do not stock.
 */

/** Matches `client/src/components/admin/inquiries/overdue.ts`. Keep in step. */
export const OVERDUE_AFTER_HOURS = 24;

/** Sunday. The counter is shut, so those hours cannot count against anybody. */
const isClosed = (date: Date): boolean => date.getDay() === 0;

/**
 * Hours elapsed, skipping closed days.
 *
 * Deliberately the same rule as the admin list's red highlighting. If the KPI
 * card and the rows disagree, staff trust neither — and the obvious
 * server-side shortcut (`createdAt < now - 24h`) disagrees every Monday
 * morning, flagging every Saturday-evening inquiry as neglected when nobody
 * could have answered it.
 */
export function openHoursSince(from: Date, to: Date = new Date()): number {
  let hours = 0;
  const cursor = new Date(from);

  while (cursor < to) {
    const next = new Date(cursor);
    next.setHours(cursor.getHours() + 1);
    if (!isClosed(cursor)) hours += 1;
    cursor.setTime(next.getTime());
  }

  return hours;
}

export interface PipelineSignals {
  /** Still `new` after a full working day. The number that should be zero. */
  overdue: number;
  /** Follow-ups whose chase date has arrived or passed, still open. */
  followUpsDue: number;
  /** Where the demand is coming from. */
  byCity: { name: string; inquiries: number }[];
  /** Sourcing requests: what people ask for that is not in the catalogue. */
  topRequestedNotStocked: { name: string; inquiries: number }[];
}

const OPEN = ['new', 'contacted', 'quoted_verbally', 'negotiating'];

export async function getPipelineSignals(): Promise<PipelineSignals> {
  const [newOnes, followUpsDue, cities, sourcing] = await Promise.all([
    /*
     * Only `new` inquiries are pulled into memory, and only their timestamps.
     * The Sunday rule cannot be expressed in a Mongo aggregation without a
     * `$function`, and this set is small by definition — if it ever is not,
     * the dashboard is the least of anybody's problems.
     */
    Inquiry.find({ status: 'new' }).select('createdAt').lean<{ createdAt: Date }[]>(),

    Inquiry.countDocuments({
      status: { $in: OPEN },
      'followUps.nextFollowUpAt': { $lte: new Date() },
    }),

    Inquiry.aggregate<{ _id: string | null; count: number }>([
      { $match: { 'customer.city': { $nin: [null, ''] } } },
      { $group: { _id: '$customer.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),

    /*
     * Grouped on a trimmed, lower-cased description. Two people asking for
     * "PNOZ X2.8P" and "pnoz x2.8p" are the same demand signal, and this list
     * only earns its place on the dashboard if it aggregates.
     */
    Inquiry.aggregate<{ _id: string; count: number }>([
      { $match: { type: 'sourcing_request', 'sourcingDetails.itemDescription': { $nin: [null, ''] } } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$sourcingDetails.itemDescription' } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const overdue = newOnes.filter(
    (row) => openHoursSince(new Date(row.createdAt)) >= OVERDUE_AFTER_HOURS,
  ).length;

  return {
    overdue,
    followUpsDue,
    byCity: cities.map((row) => ({ name: row._id ?? 'Unknown', inquiries: row.count })),
    topRequestedNotStocked: sourcing.map((row) => ({
      // Re-capitalise for display; the grouping key stays lower-cased.
      name: row._id.charAt(0).toUpperCase() + row._id.slice(1),
      inquiries: row.count,
    })),
  };
}
