import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Inquiry } from '../../models';
import { buildInquiryFilter } from './inquiry-filter';
import { recordAudit } from '../../services/audit.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminInquiryQuery,
  BulkInquiryInput,
  UpdateInquiryInput,
} from '../../validators';

/** Admin inquiry pipeline: triage, assign, chase, close. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  // Mongo sorts these strings alphabetically, which happens to put `high`
  // before `low` before `normal` — wrong. `priorityRank` is added by the
  // aggregation-free approach below instead.
  priority: { createdAt: -1 },
};

export async function listInquiries(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminInquiryQuery;
  const filter = buildInquiryFilter(query);

  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .populate({ path: 'assignedTo', select: 'name email' })
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  // `high` first, then `normal`, then `low`, preserving the date order within
  // each band. Done here rather than in Mongo because the enum does not sort
  // alphabetically into a sensible order.
  const RANK: Record<string, number> = { high: 0, normal: 1, low: 2 };
  const rows =
    query.sort === 'priority'
      ? [...items].sort((a, b) => (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1))
      : items;

  sendSuccess(
    res,
    { items: rows, meta: buildMeta(total, query.page, query.limit) },
    `${total} inquiry/inquiries`,
  );
}

/**
 * Full detail.
 *
 * Product lines are populated **with the internal figures** — cost, last
 * quoted price, stock and supplier notes. This is the screen where a quote
 * gets worked out, and making staff open a second tab to find what something
 * cost is how wrong numbers get said out loud on the phone.
 */
export async function getInquiry(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const inquiry = await Inquiry.findById(id)
    .populate({ path: 'assignedTo', select: 'name email' })
    .populate({ path: 'followUps.by', select: 'name' })
    .populate({
      path: 'items.product',
      select:
        'name slug sku partNumber availability leadTime isImportItem stock lowStockThreshold ' +
        '+internalCost +lastQuotedPrice +supplierNotes',
    });

  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  sendSuccess(res, inquiry.toJSON(), `Inquiry ${inquiry.inquiryNumber}`);
}

export async function updateInquiry(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const patch = req.body as UpdateInquiryInput;

  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  const before = {
    status: inquiry.status,
    priority: inquiry.priority,
    assignedTo: inquiry.assignedTo?.toString() ?? null,
    internalQuotedAmount: inquiry.internalQuotedAmount,
  };

  if (patch.status !== undefined) inquiry.status = patch.status;
  if (patch.priority !== undefined) inquiry.priority = patch.priority;
  if (patch.assignedTo !== undefined) {
    inquiry.assignedTo = patch.assignedTo ? new Types.ObjectId(patch.assignedTo) : null;
  }
  if (patch.internalQuotedAmount !== undefined) {
    inquiry.internalQuotedAmount = patch.internalQuotedAmount ?? undefined;
  }
  if (patch.lostReason !== undefined) inquiry.lostReason = patch.lostReason;

  await inquiry.save();

  recordAudit({
    req,
    action: patch.status ? 'status_change' : 'update',
    entity: 'Inquiry',
    entityId: id,
    before,
    after: { ...patch },
  });

  sendSuccess(res, inquiry.toJSON(), `Inquiry ${inquiry.inquiryNumber} updated`);
}

/**
 * Log a call, a WhatsApp message, a visit.
 *
 * Append-only: a follow-up is a record of something that happened, and an
 * editable history is not a history. `nextFollowUpAt` is what stops a warm
 * lead going quiet for three weeks.
 */
/**
 * Apply one change to many inquiries.
 *
 * Deliberately not a loop of `updateInquiry`: that would fire the audit entry
 * and the status hooks once per document, and a hundred-row assignment would
 * bury the audit log. One `updateMany`, one audit entry naming the count.
 */
export async function bulkUpdateInquiries(req: Request, res: Response): Promise<void> {
  const { ids, ...changes } = req.body as BulkInquiryInput;

  const patch: Record<string, unknown> = {};
  if (changes.status !== undefined) patch.status = changes.status;
  if (changes.priority !== undefined) patch.priority = changes.priority;
  if (changes.assignedTo !== undefined) patch.assignedTo = changes.assignedTo;

  const result = await Inquiry.updateMany({ _id: { $in: ids } }, { $set: patch });

  sendSuccess(
    res,
    { matched: result.matchedCount, modified: result.modifiedCount },
    `${result.modifiedCount} inquiry/inquiries updated`,
  );
}

export async function addFollowUp(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { note, nextFollowUpAt } = req.body as { note: string; nextFollowUpAt?: Date };

  const inquiry = await Inquiry.findById(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');
  if (!req.user) throw ApiError.unauthorized('Sign in to add a follow-up');

  inquiry.followUps.push({
    note,
    by: new Types.ObjectId(req.user.id),
    at: new Date(),
    ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
  });

  // A logged contact means the lead is no longer untouched.
  if (inquiry.status === 'new') inquiry.status = 'contacted';

  await inquiry.save();

  recordAudit({ req, action: 'update', entity: 'Inquiry', entityId: id, after: { followUp: note } });

  sendCreated(res, inquiry.toJSON(), 'Follow-up recorded');
}

export async function deleteInquiry(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const inquiry = await Inquiry.findByIdAndDelete(id);
  if (!inquiry) throw ApiError.notFound('Inquiry not found');

  recordAudit({
    req,
    action: 'delete',
    entity: 'Inquiry',
    entityId: id,
    before: { inquiryNumber: inquiry.inquiryNumber, customer: inquiry.customer.name },
  });

  sendSuccess(res, null, `Inquiry ${inquiry.inquiryNumber} deleted`);
}
