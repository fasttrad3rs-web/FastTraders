import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { AuditLog, Contact, Newsletter, Setting, type IAuditLog, type IContact } from '../../models';
import { recordAudit } from '../../services/audit.service';
import * as reports from '../../services/report.service';
import { buildSheet, buildWorkbook } from '../../services/sheet.service';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type { ReportQuery, UpdateSettingsInput } from '../../validators';

/** Settings, enquiries, subscribers, the audit trail and reports. */

/* -------------------------------- Settings ------------------------------- */

export async function getSettings(_req: Request, res: Response): Promise<void> {
  // Admins see everything, including bank details.
  const settings = await Setting.findOne({ key: 'global' }).lean();
  sendSuccess(res, settings, settings ? 'Site settings' : 'Settings have not been created yet');
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateSettingsInput;

  const before = await Setting.findOne({ key: 'global' }).lean();

  // Upsert keeps the singleton invariant even on a fresh database.
  const settings = await Setting.findOneAndUpdate(
    { key: 'global' },
    { $set: input, $setOnInsert: { key: 'global' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  recordAudit({
    req,
    action: 'update',
    entity: 'Setting',
    entityId: 'global',
    before: before ?? undefined,
    after: input,
  });

  sendSuccess(res, settings, 'Settings updated');
}

/* -------------------------------- Contacts ------------------------------- */

export async function listContacts(req: Request, res: Response): Promise<void> {
  const { page, limit, status, search } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  };

  const filter: FilterQuery<IContact> = { ...(status ? { status } : {}) };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { email: term }, { subject: term }, { message: term }];
  }

  const [items, total, unread] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Contact.countDocuments(filter),
    Contact.countDocuments({ status: 'new' }),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit), unread }, `${total} enquir(ies)`);
}

export async function updateContactStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: 'new' | 'read' | 'responded' };

  const contact = await Contact.findById(id);
  if (!contact) throw ApiError.notFound('Enquiry not found');

  const before = contact.status;
  contact.status = status;
  // The model stamps `respondedAt` on the transition to `responded`.
  await contact.save();

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Contact',
    entityId: id,
    before: { status: before },
    after: { status },
  });

  sendSuccess(res, contact.toJSON(), `Enquiry marked ${status}`);
}

/* ------------------------------- Newsletter ------------------------------ */

export async function listSubscribers(req: Request, res: Response): Promise<void> {
  const { page, limit, isActive } = req.query as unknown as {
    page: number;
    limit: number;
    isActive?: boolean;
  };

  const filter = isActive === undefined ? {} : { isActive };

  const [items, total] = await Promise.all([
    Newsletter.find(filter).sort({ subscribedAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Newsletter.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} subscriber(s)`);
}

export async function exportSubscribers(req: Request, res: Response): Promise<void> {
  const { format } = req.query as { format?: 'csv' | 'xlsx' };

  const subscribers = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 }).lean();

  const file = buildSheet(
    subscribers.map((item) => ({
      email: item.email,
      subscribedAt: item.subscribedAt.toISOString().slice(0, 10),
    })),
    { format: format ?? 'csv', sheetName: 'Subscribers', filenameBase: 'fast-traders-newsletter' },
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}

/* ------------------------------- Audit log ------------------------------- */

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const { page, limit, entity, entityId, actor, action, from, to } = req.query as unknown as {
    page: number;
    limit: number;
    entity?: string;
    entityId?: string;
    actor?: string;
    action?: string;
    from?: Date;
    to?: Date;
  };

  const filter: FilterQuery<IAuditLog> = {
    ...(entity ? { entity } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actor ? { actor } : {}),
    ...(action ? { action } : {}),
  };

  if (from || to) {
    filter.at = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate({ path: 'actor', select: 'name email role' })
      .sort({ at: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} audit entr(ies)`);
}

/* -------------------------------- Reports -------------------------------- */

export async function getReport(req: Request, res: Response): Promise<void> {
  const { type, format, from, to } = req.query as unknown as ReportQuery;

  const report =
    type === 'sales'
      ? await reports.salesReport(from, to)
      : type === 'inventory'
        ? await reports.inventoryReport()
        : await reports.customerReport(from, to);

  if (format === 'json') {
    sendSuccess(res, report, report.title);
    return;
  }

  if (format === 'csv') {
    const file = buildSheet(report.rows as unknown as Record<string, unknown>[], {
      format: 'csv',
      filenameBase: `fast-traders-${type}-report`,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
    return;
  }

  // XLSX gets a summary sheet alongside the detail rows.
  const summaryRows = Object.entries(report.summary).map(([metric, value]) => ({ metric, value }));
  const file = buildWorkbook(
    [
      { name: 'Summary', rows: summaryRows },
      { name: 'Detail', rows: report.rows as unknown as Record<string, unknown>[] },
    ],
    `fast-traders-${type}-report`,
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
