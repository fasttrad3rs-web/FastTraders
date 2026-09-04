import { Types, type FilterQuery } from 'mongoose';
import type { IInquiry } from '../../models';
import type { AdminInquiryQuery, InquiryExportQuery } from '../../validators';

/**
 * The one place an inquiry filter is built.
 *
 * The list and the CSV export used to build this separately, and they had
 * already drifted — the export silently ignored `source` and matched `city`
 * exactly while the list matched it case-insensitively. So "export what I am
 * looking at" quietly returned a different set of rows than the screen showed,
 * which is the worst kind of bug in a reporting feature: it looks like it
 * worked. Both callers now share this function, so the two cannot disagree.
 */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildInquiryFilter(
  query: AdminInquiryQuery | InquiryExportQuery,
): FilterQuery<IInquiry> {
  const filter: FilterQuery<IInquiry> = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assignedTo ? { assignedTo: new Types.ObjectId(query.assignedTo) } : {}),
    ...(query.source ? { source: query.source } : {}),
    ...(query.city ? { 'customer.city': new RegExp(escapeRegex(query.city), 'i') } : {}),
  };

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const term = new RegExp(escapeRegex(query.search), 'i');
    /*
     * A regex `$or` rather than the text index. Staff search by fragments —
     * "0300 12", "kohinoor", "INQ-2026" — and a text index only matches whole
     * tokens, so `$text` would return nothing for exactly the queries people
     * actually type. The collection is small enough that the scan is fine.
     */
    filter.$or = [
      { 'customer.name': term },
      { 'customer.phone': term },
      { 'customer.company': term },
      { inquiryNumber: term },
    ];
  }

  return filter;
}
