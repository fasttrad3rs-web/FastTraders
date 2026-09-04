import type { Request, Response } from 'express';
import { Banner, Contact, Newsletter, Setting } from '../models';
import { email } from '../services/email';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { ContactInput } from '../validators';

/** Contact form, newsletter, public settings and banners. */

export async function submitContact(req: Request, res: Response): Promise<void> {
  const { website, ...input } = req.body as ContactInput;

  // Honeypot: a filled hidden field means a bot. Answer 201 so it learns nothing.
  if (website) {
    sendCreated(res, null, 'Thank you — we will be in touch shortly.');
    return;
  }

  const contact = await Contact.create(input);
  email.contactAlert({
    name: contact.name,
    email: contact.email,
    ...(contact.phone ? { phone: contact.phone } : {}),
    subject: contact.subject,
    message: contact.message,
    source: contact.source,
  });

  sendCreated(res, { id: contact._id.toString() }, 'Thank you — we will be in touch shortly.');
}

export async function subscribeNewsletter(req: Request, res: Response): Promise<void> {
  const { email: address } = req.body as { email: string };

  // Upsert so a re-subscribe reactivates rather than colliding on the unique index.
  const existing = await Newsletter.findOne({ email: address });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.subscribedAt = new Date();
      await existing.save();
    }
    sendSuccess(res, null, 'You are subscribed');
    return;
  }

  await Newsletter.create({ email: address });
  sendCreated(res, null, 'Subscribed. Thank you!');
}

/** Public storefront configuration. Bank details are admin-only. */
/**
 * Public site settings.
 *
 * A **whitelist**, for the same reason `toPublicProduct` is one: `-bankDetails`
 * shipped every future field by default, so the day somebody added a margin or
 * a supplier note to Settings it would have gone straight to the browser. Only
 * what the storefront actually renders is listed.
 */
const PUBLIC_SETTING_FIELDS = [
  'key',
  'siteName',
  'tagline',
  'email',
  'phone',
  'whatsapp',
  'address',
  'mapEmbedUrl',
  'social',
  'businessHours',
  'announcement',
  'seo',
].join(' ');

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await Setting.findOne({ key: 'global' })
    .select(PUBLIC_SETTING_FIELDS)
    .lean();

  sendSuccess(res, settings, settings ? 'Site settings' : 'Settings have not been configured yet');
}

export async function listBanners(req: Request, res: Response): Promise<void> {
  const { position } = req.query as { position?: string };
  const now = new Date();

  const banners = await Banner.find({
    isActive: true,
    ...(position ? { position } : {}),
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ position: 1, displayOrder: 1 })
    .lean();

  sendSuccess(res, banners, `${banners.length} banner(s)`);
}
