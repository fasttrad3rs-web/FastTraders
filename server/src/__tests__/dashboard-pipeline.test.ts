import { openHoursSince, OVERDUE_AFTER_HOURS } from '../services/dashboard.pipeline';

/**
 * The overdue rule, server side.
 *
 * This has to agree with `client/src/components/admin/inquiries/overdue.ts`
 * exactly. The dashboard shows a count; the list paints those rows red. If the
 * card says three and only two rows are red, staff stop believing either — and
 * the obvious server shortcut (`createdAt < now - 24h`) disagrees with the
 * client every single Monday.
 */

describe('open-hours elapsed excludes closed days', () => {
  it('counts a plain weekday gap normally', () => {
    // Wed 09:00 → Thu 09:00
    const from = new Date('2026-07-29T09:00:00.000Z');
    const to = new Date('2026-07-30T09:00:00.000Z');

    expect(openHoursSince(from, to)).toBe(24);
  });

  it('does not count Sunday', () => {
    /*
     * Saturday 14:00 → Monday 14:00 is 48 clock hours, but Sunday is shut, so
     * only 24 of them were hours in which anybody could have picked up the
     * phone. That lands exactly on the threshold — the boundary case.
     */
    const saturday = new Date('2026-07-25T14:00:00.000Z');
    const monday = new Date('2026-07-27T14:00:00.000Z');

    expect(openHoursSince(saturday, monday)).toBe(24);
    expect(openHoursSince(saturday, monday) >= OVERDUE_AFTER_HOURS).toBe(true);
  });

  it('a Saturday evening inquiry is not overdue on Sunday morning', () => {
    // The case a naive `now - 24h` gets wrong, every weekend.
    const saturdayEvening = new Date('2026-07-25T18:00:00.000Z');
    const sundayMorning = new Date('2026-07-26T10:00:00.000Z');

    expect(openHoursSince(saturdayEvening, sundayMorning)).toBeLessThan(OVERDUE_AFTER_HOURS);
  });

  it('returns zero when the end is not after the start', () => {
    const now = new Date('2026-07-29T09:00:00.000Z');

    expect(openHoursSince(now, now)).toBe(0);
    expect(openHoursSince(now, new Date('2026-07-28T09:00:00.000Z'))).toBe(0);
  });

  it('agrees with the client rule on the threshold constant', () => {
    // Both files define this; a change to one without the other is the bug.
    expect(OVERDUE_AFTER_HOURS).toBe(24);
  });
});
