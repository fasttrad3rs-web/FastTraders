import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Coupon, Order, Product, type IOrderItem, type IProduct, type OrderDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { priceOrder } from './pricing.service';
import type { CreateOrderInput } from '../validators';
import type { ICartItem } from '../models/Cart';

/** Order creation: stock reservation, server-side pricing, persistence. */

type LeanProduct = IProduct & { _id: Types.ObjectId };

export interface BuiltOrderLines {
  items: IOrderItem[];
  subtotal: number;
}

/** Turn cart lines into order lines, pricing each from the live product record. */
export async function buildOrderLines(cartItems: ICartItem[]): Promise<BuiltOrderLines> {
  if (cartItems.length === 0) throw ApiError.badRequest('Your cart is empty');

  const ids = cartItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items: IOrderItem[] = [];

  for (const cartItem of cartItems) {
    const product = byId.get(cartItem.product.toString());

    if (!product || !product.isActive) {
      throw ApiError.badRequest('An item in your cart is no longer available. Please review it.');
    }
    if (product.pricingMode === 'quote' || typeof product.price !== 'number') {
      throw ApiError.badRequest(`"${product.name}" is quote-only and cannot be bought online`);
    }
    if (product.stock < cartItem.qty) {
      throw ApiError.badRequest(
        product.stock > 0
          ? `Only ${product.stock} × "${product.name}" remain in stock`
          : `"${product.name}" is out of stock`,
      );
    }
    if (cartItem.qty < product.minOrderQty) {
      throw ApiError.badRequest(
        `"${product.name}" has a minimum order quantity of ${product.minOrderQty}`,
      );
    }

    items.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
      price: product.price,
      qty: cartItem.qty,
      unit: product.unit,
      ...(cartItem.variant ? { variant: cartItem.variant } : {}),
      subtotal: Math.round(product.price * cartItem.qty * 100) / 100,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

/**
 * Atomically reserve stock.
 *
 * Each decrement is conditional on sufficient stock, so two shoppers racing for
 * the last unit cannot both win. Anything already taken is released if a later
 * line fails.
 */
async function reserveStock(items: IOrderItem[]): Promise<void> {
  const reserved: IOrderItem[] = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty, salesCount: item.qty } },
      { new: true },
    );

    if (!updated) {
      await releaseStock(reserved);
      throw ApiError.conflict(`"${item.name}" sold out while you were checking out`);
    }
    reserved.push(item);
  }
}

/** Give stock back — used on rollback and on cancellation. */
export async function releaseStock(items: IOrderItem[]): Promise<void> {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.qty, salesCount: -item.qty } },
      ).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[order] Failed to release stock for ${item.sku}: ${message}`);
      }),
    ),
  );
}

export interface CreateOrderContext {
  userId: string | null;
  cartItems: ICartItem[];
  input: CreateOrderInput;
}

export async function createOrder({
  userId,
  cartItems,
  input,
}: CreateOrderContext): Promise<OrderDocument> {
  const { items, subtotal } = await buildOrderLines(cartItems);

  const pricing = await priceOrder({
    subtotal,
    city: input.shippingAddress.city,
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
  });

  await reserveStock(items);

  try {
    const order = await Order.create({
      user: userId ? new Types.ObjectId(userId) : null,
      items,
      customer: input.customer,
      shippingAddress: input.shippingAddress,
      billingAddress: input.sameAsBilling
        ? input.shippingAddress
        : (input.billingAddress ?? input.shippingAddress),
      sameAsBilling: input.sameAsBilling,
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      shippingCost: pricing.shippingCost,
      discount: pricing.discount,
      ...(pricing.couponCode ? { couponCode: pricing.couponCode } : {}),
      total: pricing.total,
      paymentMethod: input.paymentMethod,
      // COD is confirmed immediately; every other rail waits on the gateway.
      paymentStatus: 'pending',
      orderStatus: input.paymentMethod === 'cod' ? 'confirmed' : 'pending',
      ...(input.notes ? { notes: input.notes } : {}),
    });

    if (pricing.couponCode) {
      await Coupon.updateOne({ code: pricing.couponCode }, { $inc: { usedCount: 1 } });
    }

    return order;
  } catch (error) {
    // Persistence failed after stock was taken — put it back.
    await releaseStock(items);
    throw error;
  }
}

/** Cancellation is only allowed before the order has been dispatched. */
export const CANCELLABLE_STATUSES = ['pending', 'confirmed'] as const;

export async function cancelOrder(order: OrderDocument, reason?: string): Promise<OrderDocument> {
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus as (typeof CANCELLABLE_STATUSES)[number])) {
    throw ApiError.badRequest(
      `An order that is already ${order.orderStatus} cannot be cancelled. Please call us on +92 324 4234990.`,
    );
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({
    status: 'cancelled',
    ...(reason ? { note: reason } : {}),
    at: new Date(),
  });
  await order.save();

  await releaseStock(order.items);
  return order;
}
