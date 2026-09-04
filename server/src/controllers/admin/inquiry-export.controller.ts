import type { Request, Response } from 'express';
import { Inquiry, type IInquiry } from '../../models';
import { buildSheet } from '../../services/sheet.service';
import { formatPakistaniPhone } from '../../utils/phone';
import { buildInquiryFilter } from './inquiry-filter';
import type { InquiryExportQuery } from '../../validators';

/**
 * CSV of the pipeline, for the days Sharjeel wants the list on paper.
 *
 * Shares `buildInquiryFilter` with the list screen deliberately — see that
 * file. Capped at 5000 rows; beyond that this should stream.
 */

/** CSV export of the filtered pipeline. */
export async function exportInquiries(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as InquiryExportQuery;

  const filter = buildInquiryFilter(query);

  const inquiries = await Inquiry.find(filter)
    .populate({ path: 'assignedTo', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean<(IInquiry & { assignedTo?: { name?: string } | null })[]>();

  const rows = inquiries.map((inquiry) => ({
    inquiryNumber: inquiry.inquiryNumber,
    date: inquiry.createdAt.toISOString().slice(0, 10),
    type: inquiry.type,
    status: inquiry.status,
    priority: inquiry.priority,
    name: inquiry.customer.name,
    phone: formatPakistaniPhone(inquiry.customer.phone),
    whatsapp: inquiry.customer.whatsapp ? formatPakistaniPhone(inquiry.customer.whatsapp) : '',
    email: inquiry.customer.email ?? '',
    company: inquiry.customer.company ?? '',
    city: inquiry.customer.city ?? '',
    designation: inquiry.customer.designation ?? '',
    source: inquiry.source,
    items: inquiry.items.map((item) => `${item.sku} x${item.qty}`).join(' | '),
    sourcingItem: inquiry.sourcingDetails?.itemDescription ?? '',
    message: inquiry.message ?? '',
    preferredContact: inquiry.preferredContactMethod,
    assignedTo: inquiry.assignedTo?.name ?? '',
    quotedAmount: inquiry.internalQuotedAmount ?? '',
    lostReason: inquiry.lostReason ?? '',
    followUps: inquiry.followUps.length,
    lastFollowUp: inquiry.followUps.at(-1)?.at.toISOString().slice(0, 10) ?? '',
  }));

  const file = buildSheet(rows, {
    format: 'csv',
    sheetName: 'Inquiries',
    filenameBase: 'fast-traders-inquiries',
  });

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
