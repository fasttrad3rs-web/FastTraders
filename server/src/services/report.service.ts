import type { Types } from 'mongoose';
import { Inquiry, Product } from '../models';
import { formatPakistaniPhone } from '../utils/phone';

/**
 * Operational reports for a catalogue-only business.
 *
 * "Sales" is replaced by "inquiries": there is no order collection and no
 * written quotation, so the measurable funnel is inquiries in, how many were
 * quoted on the phone, and how many were won.
 */

export interface ReportResult<T> {
  title: string;
  generatedAt: string;
  range: { from: string | null; to: string | null };
  summary: Record<string, number | string>;
  rows: T[];
}

function rangeMatch(from?: Date, to?: Date): Record<string, unknown> {
  if (!from && !to) return {};
  return { createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } };
}

/* ---------------------------- Inquiry report ----------------------------- */

export interface InquiryRow {
  inquiryNumber: string;
  date: string;
  type: string;
  customer: string;
  phone: string;
  company: string;
  city: string;
  lines: number;
  units: number;
  status: string;
  priority: string;
  quotedAmount: number | '';
  lostReason: string;
}

const WON_STATUSES = ['won'];

export async function inquiryReport(from?: Date, to?: Date): Promise<ReportResult<InquiryRow>> {
  const inquiries = await Inquiry.find(rangeMatch(from, to)).sort({ createdAt: 1 }).lean();

  const rows: InquiryRow[] = inquiries.map((inquiry) => ({
    inquiryNumber: inquiry.inquiryNumber,
    date: inquiry.createdAt.toISOString().slice(0, 10),
    type: inquiry.type,
    customer: inquiry.customer.name,
    phone: formatPakistaniPhone(inquiry.customer.phone),
    company: inquiry.customer.company ?? '',
    city: inquiry.customer.city ?? '',
    lines: inquiry.items.length,
    units: inquiry.items.reduce((sum, item) => sum + item.qty, 0),
    status: inquiry.status,
    priority: inquiry.priority,
    quotedAmount: inquiry.internalQuotedAmount ?? '',
    lostReason: inquiry.lostReason ?? '',
  }));

  const won = rows.filter((row) => WON_STATUSES.includes(row.status));
  /*
   * Pipeline is the sum of what was quoted verbally, which only exists where
   * somebody typed the figure back in after the call. It is an indication,
   * not a ledger, and the summary label says so.
   */
  const pipeline = rows.reduce(
    (sum, row) => sum + (typeof row.quotedAmount === 'number' ? row.quotedAmount : 0),
    0,
  );
  const quoted = rows.filter((row) => typeof row.quotedAmount === 'number');

  return {
    title: 'Inquiry report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      inquiries: rows.length,
      quoted: quoted.length,
      won: won.length,
      lost: rows.filter((row) => row.status === 'lost').length,
      noResponse: rows.filter((row) => row.status === 'no_response').length,
      winRate: rows.length ? `${Math.round((won.length / rows.length) * 1000) / 10}%` : '0%',
      pipelineValueQuoted: Math.round(pipeline),
      averageQuote: quoted.length ? Math.round(pipeline / quoted.length) : 0,
    },
    rows,
  };
}

/* ---------------------------- Inventory report --------------------------- */

export interface InventoryRow {
  sku: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  availability: string;
  unit: string;
  isImportItem: string;
  internalCost: number | '';
  lastQuotedPrice: number | '';
  stockValue: number;
  timesInquired: number;
}

interface PopulatedProduct {
  _id: Types.ObjectId;
  sku: string;
  name: string;
  brand?: { name?: string } | null;
  category?: { name?: string } | null;
  stock: number;
  lowStockThreshold: number;
  availability: string;
  unit: string;
  isImportItem?: boolean;
  lastQuotedPrice?: number;
  internalCost?: number;
}

export async function inventoryReport(): Promise<ReportResult<InventoryRow>> {
  // The internal figures are `select: false` so they cannot leak publicly.
  // This report is admin-only and is the whole reason they exist.
  const [products, demand] = await Promise.all([
    Product.find({})
      .select('+lastQuotedPrice +internalCost +supplierNotes +variants.price')
      .populate({ path: 'brand', select: 'name' })
      .populate({ path: 'category', select: 'name' })
      .sort({ stock: 1, name: 1 })
      .lean<PopulatedProduct[]>(),
    Inquiry.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', count: { $sum: 1 } } },
    ]),
  ]);

  const inquiredCount = new Map(demand.map((row) => [String(row._id), row.count]));

  const rows: InventoryRow[] = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    brand: product.brand?.name ?? '',
    category: product.category?.name ?? '',
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    availability: product.availability,
    unit: product.unit,
    isImportItem: product.isImportItem ? 'yes' : 'no',
    internalCost: product.internalCost ?? '',
    lastQuotedPrice: product.lastQuotedPrice ?? '',
    stockValue: Math.round(product.stock * (product.internalCost ?? 0)),
    timesInquired: inquiredCount.get(product._id.toString()) ?? 0,
  }));

  return {
    title: 'Inventory report',
    generatedAt: new Date().toISOString(),
    range: { from: null, to: null },
    summary: {
      products: rows.length,
      outOfStock: rows.filter((row) => row.stock <= 0 && row.isImportItem === 'no').length,
      lowStock: rows.filter((row) => row.stock > 0 && row.stock <= row.lowStockThreshold).length,
      imported: rows.filter((row) => row.isImportItem === 'yes').length,
      totalStockValue: rows.reduce((sum, row) => sum + row.stockValue, 0),
    },
    rows,
  };
}

/* ---------------------------- Customer report ---------------------------- */

export interface CustomerRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  city: string;
  inquiries: number;
  quotedValue: number;
  won: number;
  lastInquiry: string;
}

/**
 * Built from inquiries, not user accounts — nobody registers, so the customer
 * list *is* the inquiry history.
 *
 * Grouped on **phone**, not email. Email is optional here, so grouping on it
 * would collapse every phone-only buyer into one row keyed on null. The phone
 * number is normalised to +92XXXXXXXXXX on the way in precisely so that this
 * grouping holds when the same man types 0300 one week and +92 300 the next.
 */
export async function customerReport(from?: Date, to?: Date): Promise<ReportResult<CustomerRow>> {
  const grouped = await Inquiry.aggregate<{
    _id: string;
    name: string;
    email?: string;
    company?: string;
    city?: string;
    inquiries: number;
    quotedValue: number;
    won: number;
    last: Date;
  }>([
    { $match: rangeMatch(from, to) },
    {
      $group: {
        _id: '$customer.phone',
        name: { $last: '$customer.name' },
        email: { $last: '$customer.email' },
        company: { $last: '$customer.company' },
        city: { $last: '$customer.city' },
        inquiries: { $sum: 1 },
        quotedValue: { $sum: { $ifNull: ['$internalQuotedAmount', 0] } },
        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
        last: { $max: '$createdAt' },
      },
    },
    { $sort: { inquiries: -1 } },
  ]);

  const rows: CustomerRow[] = grouped.map((row) => ({
    name: row.name,
    phone: formatPakistaniPhone(row._id),
    email: row.email ?? '',
    company: row.company ?? '',
    city: row.city ?? '',
    inquiries: row.inquiries,
    quotedValue: Math.round(row.quotedValue),
    won: row.won,
    lastInquiry: row.last.toISOString().slice(0, 10),
  }));

  return {
    title: 'Customer report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      uniqueCustomers: rows.length,
      repeatCustomers: rows.filter((row) => row.inquiries > 1).length,
      withEmail: rows.filter((row) => row.email).length,
      totalPipelineQuoted: rows.reduce((sum, row) => sum + row.quotedValue, 0),
    },
    rows,
  };
}
