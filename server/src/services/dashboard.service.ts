import type { PipelineStage, Types } from 'mongoose';
import { Contact, Order, Product, Quotation, Review, User } from '../models';

/**
 * Dashboard KPIs.
 *
 * "Revenue" counts only orders that were actually paid for or delivered —
 * cancelled and returned orders are excluded everywhere so the numbers match
 * what is in the till.
 */

/** Orders that represent real money. */
const REVENUE_MATCH = {
  orderStatus: { $nin: ['cancelled', 'returned'] },
} as const;

export interface PeriodRevenue {
  revenue: number;
  orders: number;
}

export interface DashboardStats {
  revenue: { today: PeriodRevenue; week: PeriodRevenue; month: PeriodRevenue; year: PeriodRevenue };
  ordersByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  quotations: { new: number; awaitingResponse: number; total: number };
  inventory: { lowStock: number; outOfStock: number; totalActive: number };
  customers: { newThisMonth: number; total: number };
  averageOrderValue: number;
  /** Quotations that became orders, as a percentage of all quotations. */
  quotationConversionRate: number;
  /** Carts that became orders this month, as a percentage of carts created. */
  checkoutConversionRate: number;
  pending: { reviews: number; contacts: number };
}

function startOf(unit: 'day' | 'week' | 'month' | 'year'): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (unit === 'week') {
    // Week starts Monday — the Pakistani working week runs Mon–Sat.
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
  }
  if (unit === 'month') date.setDate(1);
  if (unit === 'year') {
    date.setMonth(0);
    date.setDate(1);
  }
  return date;
}

async function revenueSince(since: Date): Promise<PeriodRevenue> {
  const [row] = await Order.aggregate<{ revenue: number; orders: number }>([
    { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: Math.round(row?.revenue ?? 0), orders: row?.orders ?? 0 };
}

async function countBy(field: 'orderStatus' | 'paymentStatus'): Promise<Record<string, number>> {
  const rows = await Order.aggregate<{ _id: string; count: number }>([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

export async function getStats(): Promise<DashboardStats> {
  const monthStart = startOf('month');

  const [
    today,
    week,
    month,
    year,
    ordersByStatus,
    paymentsByStatus,
    newQuotations,
    awaitingResponse,
    totalQuotations,
    convertedQuotations,
    lowStock,
    outOfStock,
    totalActive,
    newCustomers,
    totalCustomers,
    aovRow,
    pendingReviews,
    newContacts,
    ordersThisMonth,
  ] = await Promise.all([
    revenueSince(startOf('day')),
    revenueSince(startOf('week')),
    revenueSince(monthStart),
    revenueSince(startOf('year')),
    countBy('orderStatus'),
    countBy('paymentStatus'),
    Quotation.countDocuments({ status: 'new' }),
    Quotation.countDocuments({ status: { $in: ['quoted', 'negotiating'] } }),
    Quotation.countDocuments({}),
    Quotation.countDocuments({ status: 'converted' }),
    Product.countDocuments({
      isActive: true,
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: monthStart } }),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate<{ avg: number }>([
      { $match: REVENUE_MATCH },
      { $group: { _id: null, avg: { $avg: '$total' } } },
    ]),
    Review.countDocuments({ isApproved: false }),
    Contact.countDocuments({ status: 'new' }),
    Order.countDocuments({ ...REVENUE_MATCH, createdAt: { $gte: monthStart } }),
  ]);

  // Checkout conversion: orders placed this month vs. shopping carts touched.
  const cartsThisMonth = await Order.db
    .collection('carts')
    .countDocuments({ type: 'shopping', updatedAt: { $gte: monthStart } });

  const pct = (part: number, whole: number): number =>
    whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

  return {
    revenue: { today, week, month, year },
    ordersByStatus,
    paymentsByStatus,
    quotations: { new: newQuotations, awaitingResponse, total: totalQuotations },
    inventory: { lowStock, outOfStock, totalActive },
    customers: { newThisMonth: newCustomers, total: totalCustomers },
    averageOrderValue: Math.round(aovRow[0]?.avg ?? 0),
    quotationConversionRate: pct(convertedQuotations, totalQuotations),
    checkoutConversionRate: pct(ordersThisMonth, Math.max(cartsThisMonth, ordersThisMonth)),
    pending: { reviews: pendingReviews, contacts: newContacts },
  };
}

/* --------------------------------- Charts -------------------------------- */

export interface SalesPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface NamedTotal {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface DashboardCharts {
  salesOverTime: SalesPoint[];
  topProducts: NamedTotal[];
  revenueByCategory: NamedTotal[];
  revenueByBrand: NamedTotal[];
}

const FORMATS = { daily: '%Y-%m-%d', weekly: '%G-W%V', monthly: '%Y-%m' } as const;

export async function getCharts(
  granularity: keyof typeof FORMATS,
  days: number,
): Promise<DashboardCharts> {
  const since = new Date(Date.now() - days * 86_400_000);
  const match = { ...REVENUE_MATCH, createdAt: { $gte: since } };

  const salesPipeline: PipelineStage[] = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: FORMATS[granularity], date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  /** Revenue attributed per line item, joined to a lookup collection. */
  const byRef = (from: string, localField: string): PipelineStage[] => [
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: `$product.${localField}`,
        revenue: { $sum: '$items.subtotal' },
        units: { $sum: '$items.qty' },
      },
    },
    { $lookup: { from, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $unwind: '$ref' },
    { $project: { name: '$ref.name', revenue: 1, units: 1 } },
    { $sort: { revenue: -1 } },
    { $limit: 12 },
  ];

  const [sales, topProducts, byCategory, byBrand] = await Promise.all([
    Order.aggregate<{ _id: string; revenue: number; orders: number }>(salesPipeline),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.qty' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>(
      byRef('categories', 'category'),
    ),
    Order.aggregate<{ _id: Types.ObjectId; name: string; revenue: number; units: number }>(
      byRef('brands', 'brand'),
    ),
  ]);

  const toNamed = (rows: { _id: Types.ObjectId; name: string; revenue: number; units: number }[]): NamedTotal[] =>
    rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      revenue: Math.round(row.revenue),
      units: row.units,
    }));

  return {
    salesOverTime: sales.map((row) => ({
      period: row._id,
      revenue: Math.round(row.revenue),
      orders: row.orders,
    })),
    topProducts: toNamed(topProducts),
    revenueByCategory: toNamed(byCategory),
    revenueByBrand: toNamed(byBrand),
  };
}

/* --------------------------------- Recent -------------------------------- */

export async function getRecent(): Promise<Record<string, unknown[]>> {
  const [orders, quotations, reviews, contacts] = await Promise.all([
    Order.find()
      .select('orderNumber customer total orderStatus paymentStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Quotation.find()
      .select('quoteNumber customer status quotedTotal createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Review.find()
      .select('product user rating title isApproved createdAt')
      .populate({ path: 'user', select: 'name' })
      .populate({ path: 'product', select: 'name slug' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Contact.find()
      .select('name email subject status createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return { orders, quotations, reviews, contacts };
}
