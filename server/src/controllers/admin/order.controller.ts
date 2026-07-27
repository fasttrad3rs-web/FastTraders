import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Order, Setting, type IOrder, type ISetting } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { email } from '../../services/email';
import { releaseStock } from '../../services/order.service';
import { generateInvoicePdf } from '../../services/pdf';
import { buildSheet } from '../../services/sheet.service';
import { ApiError } from '../../utils/ApiError';
import { sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  UpdatePaymentInput,
  UpdateTrackingInput,
} from '../../validators';

/** Admin order management. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  total_desc: { total: -1 },
  total_asc: { total: 1 },
};

/** Stock is returned to the shelf when an order leaves the fulfilment path. */
const STOCK_RELEASING = new Set(['cancelled', 'returned']);

function buildFilter(query: AdminOrderQuery): FilterQuery<IOrder> {
  const filter: FilterQuery<IOrder> = {
    ...(query.status ? { orderStatus: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
  };

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [
      { orderNumber: term },
      { 'customer.name': term },
      { 'customer.email': term },
      { 'customer.phone': term },
      { trackingNumber: term },
    ];
  }

  return filter;
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminOrderQuery;
  const filter = buildFilter(query);

  const [items, total, totals] = await Promise.all([
    Order.find(filter)
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ revenue: number }>([
      { $match: { ...filter, orderStatus: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
  ]);

  sendSuccess(
    res,
    {
      items,
      meta: buildMeta(total, query.page, query.limit),
      // Revenue for the current filter, so the header figure matches the table.
      filteredRevenue: Math.round(totals[0]?.revenue ?? 0),
    },
    `${total} order(s)`,
  );
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const order = await Order.findById(id)
    .populate({ path: 'user', select: 'name email phone companyName' })
    .populate({ path: 'statusHistory.changedBy', select: 'name' });

  if (!order) throw ApiError.notFound('Order not found');
  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber}`);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { status, note, notifyCustomer } = req.body as UpdateOrderStatusInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const previous = order.orderStatus;
  if (previous === status) throw ApiError.badRequest(`This order is already ${status}`);

  order.orderStatus = status;
  order.statusHistory.push({
    status,
    ...(note ? { note } : {}),
    ...(req.user ? { changedBy: order.user ?? undefined } : {}),
    at: new Date(),
  });
  await order.save();

  if (STOCK_RELEASING.has(status) && !STOCK_RELEASING.has(previous)) {
    await releaseStock(order.items);
  }

  if (notifyCustomer) {
    email.orderStatus(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status,
      ...(note ? { note } : {}),
      ...(order.trackingNumber ? { trackingNumber: order.trackingNumber } : {}),
      ...(order.courier ? { courier: order.courier } : {}),
    });
  }

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Order',
    entityId: id,
    before: { orderStatus: previous },
    after: { orderStatus: status, note },
  });

  sendSuccess(
    res,
    order.toJSON(),
    `Order ${order.orderNumber} is now ${status}${notifyCustomer ? ' — customer notified' : ''}`,
  );
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdatePaymentInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const before = { paymentStatus: order.paymentStatus, paymentDetails: order.paymentDetails };

  order.paymentStatus = input.paymentStatus;
  order.paymentDetails = {
    ...order.paymentDetails,
    ...(input.transactionId ? { transactionId: input.transactionId } : {}),
    ...(input.provider ? { provider: input.provider } : {}),
    ...(input.receiptUrl ? { receiptUrl: input.receiptUrl } : {}),
    ...(input.paymentStatus === 'paid' ? { paidAt: new Date() } : {}),
  };

  // Payment on a still-pending order confirms it.
  if (input.paymentStatus === 'paid' && order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
    order.statusHistory.push({ status: 'confirmed', note: 'Payment received', at: new Date() });
  }

  await order.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Order',
    entityId: id,
    before,
    after: { paymentStatus: input.paymentStatus, note: input.note },
  });

  sendSuccess(res, order.toJSON(), `Payment marked ${input.paymentStatus}`);
}

export async function updateTracking(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateTrackingInput;

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  if (input.trackingNumber !== undefined) order.trackingNumber = input.trackingNumber;
  if (input.courier !== undefined) order.courier = input.courier;

  if (input.markShipped && order.orderStatus !== 'shipped') {
    order.orderStatus = 'shipped';
    order.statusHistory.push({
      status: 'shipped',
      note: `Handed to ${order.courier ?? 'courier'}`,
      at: new Date(),
    });
    email.orderStatus(order.customer.email, {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      status: 'shipped',
      ...(order.trackingNumber ? { trackingNumber: order.trackingNumber } : {}),
      ...(order.courier ? { courier: order.courier } : {}),
    });
  }

  await order.save();

  recordAudit({ req, action: 'update', entity: 'Order', entityId: id, after: { ...input } });
  sendSuccess(res, order.toJSON(), 'Tracking details updated');
}

export async function downloadInvoice(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const order = await Order.findById(id).lean<IOrder>();
  if (!order) throw ApiError.notFound('Order not found');

  const settings = await Setting.findOne({ key: 'global' })
    .select('bankDetails defaultTaxRate')
    .lean<Pick<ISetting, 'bankDetails' | 'defaultTaxRate'>>();

  const pdf = await generateInvoicePdf({ order, settings });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${order.orderNumber}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.send(pdf);
}

export async function exportOrders(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminOrderQuery & { format?: 'csv' | 'xlsx' };
  const orders = await Order.find(buildFilter(query)).sort({ createdAt: -1 }).lean();

  const rows = orders.map((order) => ({
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString().slice(0, 10),
    customer: order.customer.name,
    company: order.customer.companyName ?? '',
    phone: order.customer.phone,
    email: order.customer.email,
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
    courier: order.courier ?? '',
    trackingNumber: order.trackingNumber ?? '',
  }));

  const file = buildSheet(rows, {
    format: query.format ?? 'xlsx',
    sheetName: 'Orders',
    filenameBase: 'fast-traders-orders',
  });

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
