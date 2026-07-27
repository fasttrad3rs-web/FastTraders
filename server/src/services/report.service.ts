import type { Types } from 'mongoose';
import { Order, Product, User } from '../models';

/**
 * Operational reports. Each returns a flat row set so the same data can be
 * rendered as JSON in the admin UI or streamed out as CSV/XLSX.
 */

export interface ReportResult<T> {
  title: string;
  generatedAt: string;
  range: { from: string | null; to: string | null };
  summary: Record<string, number | string>;
  rows: T[];
}

const REVENUE_MATCH = { orderStatus: { $nin: ['cancelled', 'returned'] } } as const;

function rangeMatch(from?: Date, to?: Date): Record<string, unknown> {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    },
  };
}

/* ------------------------------ Sales report ----------------------------- */

export interface SalesRow {
  orderNumber: string;
  date: string;
  customer: string;
  city: string;
  items: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
}

export async function salesReport(from?: Date, to?: Date): Promise<ReportResult<SalesRow>> {
  const filter = { ...REVENUE_MATCH, ...rangeMatch(from, to) };
  const orders = await Order.find(filter).sort({ createdAt: 1 }).lean();

  const rows: SalesRow[] = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    customer: order.customer.name,
    city: order.shippingAddress.city,
    items: order.items.reduce((sum, item) => sum + item.qty, 0),
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.taxAmount,
    shipping: order.shippingCost,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
  }));

  const revenue = rows.reduce((sum, row) => sum + row.total, 0);

  return {
    title: 'Sales report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      orders: rows.length,
      revenue: Math.round(revenue),
      averageOrderValue: rows.length ? Math.round(revenue / rows.length) : 0,
      unitsSold: rows.reduce((sum, row) => sum + row.items, 0),
      totalDiscount: Math.round(rows.reduce((sum, row) => sum + row.discount, 0)),
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
  pricingMode: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  price: number | '';
  costPrice: number | '';
  /** stock × costPrice — what is sitting on the shelf. */
  stockValue: number;
  salesCount: number;
}

interface PopulatedProduct {
  sku: string;
  name: string;
  brand?: { name?: string } | null;
  category?: { name?: string } | null;
  pricingMode: string;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  price?: number;
  costPrice?: number;
  salesCount: number;
}

export async function inventoryReport(): Promise<ReportResult<InventoryRow>> {
  // `+costPrice` is required: it is `select: false` for public safety.
  const products = await Product.find({})
    .select('+costPrice')
    .populate({ path: 'brand', select: 'name' })
    .populate({ path: 'category', select: 'name' })
    .sort({ stock: 1, name: 1 })
    .lean<PopulatedProduct[]>();

  const rows: InventoryRow[] = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    brand: product.brand?.name ?? '',
    category: product.category?.name ?? '',
    pricingMode: product.pricingMode,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    stockStatus: product.stockStatus,
    unit: product.unit,
    price: product.price ?? '',
    costPrice: product.costPrice ?? '',
    stockValue: Math.round(product.stock * (product.costPrice ?? 0)),
    salesCount: product.salesCount,
  }));

  return {
    title: 'Inventory report',
    generatedAt: new Date().toISOString(),
    range: { from: null, to: null },
    summary: {
      products: rows.length,
      outOfStock: rows.filter((row) => row.stock <= 0).length,
      lowStock: rows.filter((row) => row.stock > 0 && row.stock <= row.lowStockThreshold).length,
      totalStockValue: rows.reduce((sum, row) => sum + row.stockValue, 0),
    },
    rows,
  };
}

/* ---------------------------- Customer report ---------------------------- */

export interface CustomerRow {
  name: string;
  email: string;
  phone: string;
  company: string;
  joined: string;
  orders: number;
  lifetimeValue: number;
  lastOrder: string;
}

export async function customerReport(from?: Date, to?: Date): Promise<ReportResult<CustomerRow>> {
  const users = await User.find({ role: 'customer', ...rangeMatch(from, to) })
    .sort({ createdAt: -1 })
    .lean();

  const totals = await Order.aggregate<{
    _id: Types.ObjectId | null;
    orders: number;
    value: number;
    last: Date;
  }>([
    { $match: { ...REVENUE_MATCH, user: { $ne: null } } },
    {
      $group: {
        _id: '$user',
        orders: { $sum: 1 },
        value: { $sum: '$total' },
        last: { $max: '$createdAt' },
      },
    },
  ]);

  const byUser = new Map(totals.filter((row) => row._id).map((row) => [String(row._id), row]));

  const rows: CustomerRow[] = users.map((user) => {
    const stats = byUser.get(user._id.toString());
    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.companyName ?? '',
      joined: user.createdAt.toISOString().slice(0, 10),
      orders: stats?.orders ?? 0,
      lifetimeValue: Math.round(stats?.value ?? 0),
      lastOrder: stats?.last ? stats.last.toISOString().slice(0, 10) : '',
    };
  });

  const withOrders = rows.filter((row) => row.orders > 0);

  return {
    title: 'Customer report',
    generatedAt: new Date().toISOString(),
    range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    summary: {
      customers: rows.length,
      purchasers: withOrders.length,
      repeatBuyers: rows.filter((row) => row.orders > 1).length,
      totalLifetimeValue: rows.reduce((sum, row) => sum + row.lifetimeValue, 0),
      averageLifetimeValue: withOrders.length
        ? Math.round(withOrders.reduce((sum, row) => sum + row.lifetimeValue, 0) / withOrders.length)
        : 0,
    },
    rows,
  };
}
