jest.mock('../models', () => ({
  Setting: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));
jest.mock('../services/audit.service', () => ({ recordAudit: jest.fn() }));
jest.mock('../services/revalidate.service', () => ({ revalidate: jest.fn() }));

import type { Request, Response } from 'express';
import { Setting } from '../models';
import { updateSettings } from '../controllers/admin/content.controller';

/**
 * A partial settings save must not erase the parts it did not edit.
 *
 * `$set: { social: { facebook: 'x' } }` replaces the entire `social`
 * subdocument. The admin screen edits three of the five links, so every save
 * silently wiped the seeded `social.whatsapp` — the footer's WhatsApp link
 * simply stopped working, with nothing on screen to explain it.
 *
 * The controller now rewrites nested objects as dot paths, which merge.
 */

function run(body: unknown): Promise<void> {
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
  return updateSettings({ body, ip: '127.0.0.1' } as unknown as Request, res);
}

/** The `$set` document handed to Mongo by the call under test. */
function sentSet(): Record<string, unknown> {
  const [, update] = (Setting.findOneAndUpdate as jest.Mock).mock.calls[0] as [
    unknown,
    { $set: Record<string, unknown> },
  ];
  return update.$set;
}

describe('settings patches merge instead of replacing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Setting.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve({}) });
    (Setting.findOneAndUpdate as jest.Mock).mockResolvedValue({});
  });

  it('writes a nested field as a dot path, leaving its siblings alone', async () => {
    await run({ social: { facebook: 'https://facebook.com/fasttraders' } });

    expect(sentSet()).toEqual({ 'social.facebook': 'https://facebook.com/fasttraders' });
    // The bug: a whole-object $set would have carried `social` and taken
    // `social.whatsapp` down with it.
    expect(sentSet()).not.toHaveProperty('social');
  });

  it('carries a null through as a dot path, so a field can be cleared', async () => {
    await run({ social: { instagram: null } });

    expect(sentSet()).toEqual({ 'social.instagram': null });
  });

  it('does not descend into a null — it clears the whole block', async () => {
    await run({ bankDetails: null });

    expect(sentSet()).toEqual({ bankDetails: null });
  });

  it('replaces an array wholesale, because editing a list means replacing it', async () => {
    const hours = [{ days: 'Monday – Saturday', open: '10:00', close: '19:00' }];
    await run({ businessHours: hours });

    expect(sentSet()).toEqual({ businessHours: hours });
  });

  it('leaves top-level scalars exactly as they arrived', async () => {
    await run({ storeName: 'Fast Traders', landline: null });

    expect(sentSet()).toEqual({ storeName: 'Fast Traders', landline: null });
  });
});
