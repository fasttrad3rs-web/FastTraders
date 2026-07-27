import type { Request, Response } from 'express';
import { Order, type OrderDocument } from '../models';
import { recordAudit } from '../services/audit.service';
import { clearCart, getOrCreateCart } from '../services/cart.service';
import { email } from '../services/email';
import * as orderService from '../services/order.service';
import { cartOwner, readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateOrderInput } from '../validators';

/** Customer-facing order endpoints. Guest checkout is supported throughout. */

function toEmailData(order: OrderDocument): Parameters<typeof email.orderConfirmation>[1] {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      price: item.price,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingCity: order.shippingAddress.city,
  };
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateOrderInput;

  const owner = cartOwner(req, readSessionId(req));
  const cart = await getOrCreateCart(owner, 'shopping');

  const order = await orderService.createOrder({
    userId: req.user?.id ?? null,
    cartItems: cart.items,
    input,
  });

  await clearCart(owner, 'shopping');

  const emailData = toEmailData(order);
  email.orderConfirmation(order.customer.email, emailData);
  email.newOrderAlert({
    ...emailData,
    customerPhone: order.customer.phone,
    customerEmail: order.customer.email,
  });

  recordAudit({
    req,
    action: 'create',
    entity: 'Order',
    entityId: order._id.toString(),
    after: { orderNumber: order.orderNumber, total: order.total },
  });

  sendCreated(res, order.toJSON(), `Order ${order.orderNumber} placed`);
}

export async function listMyOrders(req: Request, res: Response): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };

  const filter = { user: req.user?.id, ...(status ? { orderStatus: status } : {}) };

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} order(s)`);
}

/**
 * Order lookup by number. A signed-in customer sees their own orders; admins
 * and managers see any. Guests must supply the email used at checkout, which
 * keeps order numbers from being enumerable.
 */
export async function getOrder(req: Request, res: Response): Promise<void> {
  const { orderNumber } = req.params as { orderNumber: string };
  const { email: guestEmail } = req.query as { email?: string };

  const order = await Order.findOne({ orderNumber });
  if (!order) throw ApiError.notFound('Order not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && order.user?.toString() === req.user.id);
  const isGuestMatch =
    !req.user &&
    typeof guestEmail === 'string' &&
    guestEmail.toLowerCase() === order.customer.email.toLowerCase();

  if (!isStaff && !isOwner && !isGuestMatch) {
    throw ApiError.forbidden('You do not have access to this order');
  }

  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber}`);
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { reason } = req.body as { reason?: string };

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && order.user?.toString() === req.user.id);
  if (!isStaff && !isOwner) throw ApiError.forbidden('You do not have access to this order');

  const previousStatus = order.orderStatus;
  await orderService.cancelOrder(order, reason);

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Order',
    entityId: order._id.toString(),
    before: { orderStatus: previousStatus },
    after: { orderStatus: 'cancelled', reason },
  });

  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber} cancelled and stock released`);
}
