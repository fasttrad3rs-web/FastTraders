jest.mock('../models', () => ({
  Inquiry: { find: jest.fn() },
}));

import { Inquiry } from '../models';
import { DUPLICATE_WINDOW_MS, findRecentDuplicate } from '../services/spam-score.service';

/**
 * Duplicate detection: same phone, same items, within ten minutes.
 *
 * This is aimed at the double-tapped submit button far more than at an
 * attacker — a buyer on a slow connection presses Send twice, and without this
 * Sharjeel gets two identical rows to call. The customer must still see a
 * success, so the caller returns the *original* receipt rather than an error.
 */

interface Row {
  inquiryNumber: string;
  items: { product: string }[];
}

/** Typed view of the filter the service handed to Mongo. */
function filterFromLastCall(): { 'customer.phone': string; createdAt: { $gte: Date } } {
  const calls = (Inquiry.find as jest.Mock).mock.calls as unknown[][];
  return calls[0]?.[0] as { 'customer.phone': string; createdAt: { $gte: Date } };
}

function stubRecent(rows: Row[]): void {
  const chain = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(rows),
  };
  (Inquiry.find as jest.Mock).mockReturnValue(chain);
}

describe('recent duplicate detection', () => {
  it('matches the same phone and the same items', async () => {
    stubRecent([{ inquiryNumber: 'FT-INQ-202607-0001', items: [{ product: 'a' }, { product: 'b' }] }]);

    await expect(findRecentDuplicate('03001234567', ['a', 'b'])).resolves.toEqual({
      inquiryNumber: 'FT-INQ-202607-0001',
    });
  });

  it('ignores the order the items were added in', async () => {
    stubRecent([{ inquiryNumber: 'FT-INQ-202607-0002', items: [{ product: 'b' }, { product: 'a' }] }]);

    await expect(findRecentDuplicate('03001234567', ['a', 'b'])).resolves.not.toBeNull();
  });

  it('lets a different product through', async () => {
    /*
     * The important negative case. Somebody who asks about an MCCB and then,
     * two minutes later, about a contactor is a *good* customer having a
     * productive afternoon — not a duplicate.
     */
    stubRecent([{ inquiryNumber: 'FT-INQ-202607-0003', items: [{ product: 'a' }] }]);

    await expect(findRecentDuplicate('03001234567', ['different'])).resolves.toBeNull();
  });

  it('lets a longer list from the same number through', async () => {
    // They added one more item and resubmitted — a new, larger inquiry.
    stubRecent([{ inquiryNumber: 'FT-INQ-202607-0004', items: [{ product: 'a' }] }]);

    await expect(findRecentDuplicate('03001234567', ['a', 'b'])).resolves.toBeNull();
  });

  it('only looks back over the duplicate window', async () => {
    stubRecent([]);
    const now = new Date('2026-07-29T10:00:00.000Z');

    await findRecentDuplicate('03001234567', ['a'], now);

    expect(filterFromLastCall().createdAt.$gte).toEqual(new Date(now.getTime() - DUPLICATE_WINDOW_MS));
  });

  it('scopes the query to the caller phone number', async () => {
    stubRecent([]);

    await findRecentDuplicate('03009999999', ['a']);

    expect(filterFromLastCall()['customer.phone']).toBe('03009999999');
  });

  it('returns null when nothing recent exists', async () => {
    stubRecent([]);

    await expect(findRecentDuplicate('03001234567', ['a'])).resolves.toBeNull();
  });
});
