import { Contact, Inquiry, InquiryList, Product, Testimonial } from '../models';
import { getPipelineSignals } from './dashboard.pipeline';

/**
 * Dashboard KPIs.
 *
 * There is no revenue to report — the site takes no money. The funnel is
 * shortlist → inquiry → contacted → quoted on the phone → won or lost.
 * `internalQuotedAmount` is the only field with money in it, and it exists
 * only where somebody typed the figure back in after the call, so it is
 * labelled pipeline throughout and never income.
 */

export interface DashboardStats {
  inquiries: { newToday: number; newThisWeek: number; total: number; open: number };
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  /** Value quoted verbally. Indicative — see the note above. */
  pipeline: { quotedThisMonth: number; wonThisMonth: number; averageQuote: number };
  inventory: { lowStock: number; outOfStock: number; imported: number; totalActive: number };
  winRate: number;
  /** In `new` with nobody assigned — the thing to fix before lunch. */
  unassigned: number;
  /** Shortlists with items that were never submitted. */
  abandonedLists: number;
  pending: { contacts: number; testimonials: number };
  /** Still `new` after a full working day — the number that should be zero. */
  overdue: number;
  /** Chase dates that have arrived or passed on still-open inquiries. */
  followUpsDue: number;
  /** Where the demand comes from. */
  byCity: { name: string; inquiries: number }[];
  /** Most-asked-for items that are not in the catalogue. */
  topRequestedNotStocked: { name: string; inquiries: number }[];
}

function startOf(unit: 'day' | 'week' | 'month'): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (unit === 'week') {
    // Monday start — the Lahore working week runs Mon–Sat.
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  }
  if (unit === 'month') date.setDate(1);
  return date;
}

const OPEN_STATUSES = ['new', 'contacted', 'quoted_verbally', 'negotiating'];

async function sumQuoted(match: Record<string, unknown>): Promise<number> {
  const [row] = await Inquiry.aggregate<{ total: number }>([
    { $match: { ...match, internalQuotedAmount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: '$internalQuotedAmount' } } },
  ]);
  return Math.round(row?.total ?? 0);
}

export async function getStats(): Promise<DashboardStats> {
  const monthStart = startOf('month');

  const [
    newToday,
    newThisWeek,
    total,
    open,
    statusCounts,
    typeCounts,
    quotedThisMonth,
    wonThisMonth,
    averageRow,
    lowStock,
    outOfStock,
    imported,
    totalActive,
    unassigned,
    abandonedLists,
    pendingContacts,
    pendingTestimonials,
    wonAllTime,
    signals,
  ] = await Promise.all([
    Inquiry.countDocuments({ createdAt: { $gte: startOf('day') } }),
    Inquiry.countDocuments({ createdAt: { $gte: startOf('week') } }),
    Inquiry.countDocuments({}),
    Inquiry.countDocuments({ status: { $in: OPEN_STATUSES } }),
    Inquiry.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Inquiry.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    sumQuoted({ createdAt: { $gte: monthStart } }),
    sumQuoted({ status: 'won', createdAt: { $gte: monthStart } }),
    Inquiry.aggregate<{ avg: number }>([
      { $match: { internalQuotedAmount: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$internalQuotedAmount' } } },
    ]),
    Product.countDocuments({
      isActive: true,
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 }, isImportItem: false }),
    Product.countDocuments({ isActive: true, isImportItem: true }),
    Product.countDocuments({ isActive: true }),
    Inquiry.countDocuments({ status: 'new', assignedTo: null }),
    InquiryList.countDocuments({ 'items.0': { $exists: true } }),
    Contact.countDocuments({ status: 'new' }),
    Testimonial.countDocuments({ isPublished: false }),
    Inquiry.countDocuments({ status: 'won' }),
    getPipelineSignals(),
  ]);

  const toMap = (rows: { _id: string; count: number }[]): Record<string, number> =>
    Object.fromEntries(rows.map((row) => [row._id, row.count]));

  const pct = (part: number, whole: number): number =>
    whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

  return {
    inquiries: { newToday, newThisWeek, total, open },
    byStatus: toMap(statusCounts),
    byType: toMap(typeCounts),
    pipeline: {
      quotedThisMonth,
      wonThisMonth,
      averageQuote: Math.round(averageRow[0]?.avg ?? 0),
    },
    inventory: { lowStock, outOfStock, imported, totalActive },
    winRate: pct(wonAllTime, total),
    unassigned,
    abandonedLists,
    pending: { contacts: pendingContacts, testimonials: pendingTestimonials },
    ...signals,
  };
}

/* --------------------------------- Charts -------------------------------- */

export interface DashboardCharts {
  inquiriesOverTime: { period: string; inquiries: number; won: number }[];
  topInquiredProducts: { id: string; name: string; inquiries: number; units: number }[];
  inquiriesByCategory: { id: string; name: string; inquiries: number; units: number }[];
  inquiriesByBrand: { id: string; name: string; inquiries: number; units: number }[];
}

const FORMATS = { daily: '%Y-%m-%d', weekly: '%G-W%V', monthly: '%Y-%m' } as const;

export async function getCharts(
  granularity: keyof typeof FORMATS,
  days: number,
): Promise<DashboardCharts> {
  const since = new Date(Date.now() - days * 86_400_000);
  const match = { createdAt: { $gte: since } };

  /** Line demand grouped by a product field, joined for the display name. */
  const byRef = (from: string, field: string): Parameters<typeof Inquiry.aggregate>[0] => [
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: `$product.${field}`,
        inquiries: { $sum: 1 },
        units: { $sum: '$items.qty' },
      },
    },
    { $lookup: { from, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $unwind: '$ref' },
    { $project: { name: '$ref.name', inquiries: 1, units: 1 } },
    { $sort: { inquiries: -1 } },
    { $limit: 10 },
  ];

  type Row = { _id: unknown; name: string; inquiries: number; units: number };

  const [overTime, topProducts, byCategory, byBrand] = await Promise.all([
    Inquiry.aggregate<{ _id: string; inquiries: number; won: number }>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: FORMATS[granularity], date: '$createdAt' } },
          inquiries: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Inquiry.aggregate<Row>([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          inquiries: { $sum: 1 },
          units: { $sum: '$items.qty' },
        },
      },
      { $sort: { inquiries: -1 } },
      { $limit: 10 },
    ]),
    Inquiry.aggregate<Row>(byRef('categories', 'category')),
    Inquiry.aggregate<Row>(byRef('brands', 'brand')),
  ]);

  const named = (rows: Row[]): DashboardCharts['topInquiredProducts'] =>
    rows.map((row) => ({
      id: String(row._id),
      name: row.name,
      inquiries: row.inquiries,
      units: row.units,
    }));

  return {
    inquiriesOverTime: overTime.map((row) => ({
      period: row._id,
      inquiries: row.inquiries,
      won: row.won,
    })),
    topInquiredProducts: named(topProducts),
    inquiriesByCategory: named(byCategory),
    inquiriesByBrand: named(byBrand),
  };
}

/* --------------------------------- Recent -------------------------------- */

export async function getRecent(): Promise<Record<string, unknown[]>> {
  const [inquiries, contacts, testimonials] = await Promise.all([
    Inquiry.find()
      .select('inquiryNumber customer type status priority createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Contact.find().select('name email subject status createdAt').sort({ createdAt: -1 }).limit(10).lean(),
    Testimonial.find().select('author company isPublished createdAt').sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return { inquiries, contacts, testimonials };
}
