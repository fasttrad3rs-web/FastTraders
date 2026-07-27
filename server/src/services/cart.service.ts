import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Cart, Product, type CartDocument, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import type { CartType, PricingMode } from '../types';

/**
 * Cart domain logic, shared by both carts.
 *
 * The `type` discriminator decides which products are admissible:
 *   shopping -> pricingMode retail | both
 *   inquiry  -> pricingMode quote  | both
 */

export interface CartOwner {
  user: string | null;
  sessionId: string | null;
}

const ADMISSIBLE: Record<CartType, PricingMode[]> = {
  shopping: ['retail', 'both'],
  inquiry: ['quote', 'both'],
};

function ownerFilter(owner: CartOwner, type: CartType): Record<string, unknown> {
  if (owner.user) return { user: new Types.ObjectId(owner.user), type };
  if (owner.sessionId) return { sessionId: owner.sessionId, type };
  throw ApiError.badRequest('No cart owner could be determined');
}

/** Fetch the caller's cart, creating an empty one on first use. */
export async function getOrCreateCart(owner: CartOwner, type: CartType): Promise<CartDocument> {
  const filter = ownerFilter(owner, type);
  const existing = await Cart.findOne(filter);
  if (existing) return existing;

  const cart = new Cart({
    type,
    user: owner.user ? new Types.ObjectId(owner.user) : null,
    sessionId: owner.user ? null : owner.sessionId,
  });
  await cart.save();
  return cart;
}

/** Load a product and check it may enter this cart. */
async function loadAdmissibleProduct(
  productId: string,
  type: CartType,
): Promise<IProduct & { _id: Types.ObjectId }> {
  const product = await Product.findById(productId).lean<IProduct & { _id: Types.ObjectId }>();

  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  const allowed = ADMISSIBLE[type];
  if (!allowed.includes(product.pricingMode)) {
    throw ApiError.badRequest(
      type === 'shopping'
        ? 'This product is quote-only. Add it to your inquiry list instead.'
        : 'This product is sold at a fixed price. Add it to your cart instead.',
    );
  }

  return product;
}

export interface AddItemInput {
  product: string;
  qty: number;
  variant?: string;
  note?: string;
}

export async function addItem(
  owner: CartOwner,
  type: CartType,
  input: AddItemInput,
): Promise<CartDocument> {
  const product = await loadAdmissibleProduct(input.product, type);
  const cart = await getOrCreateCart(owner, type);

  if (input.qty < product.minOrderQty) {
    throw ApiError.badRequest(
      `Minimum order quantity for this item is ${product.minOrderQty} ${product.unit}`,
    );
  }

  // Only the shopping cart enforces stock; an RFQ may exceed what is on hand.
  if (type === 'shopping' && product.stock < input.qty) {
    throw ApiError.badRequest(
      product.stock > 0 ? `Only ${product.stock} in stock` : 'This item is out of stock',
    );
  }

  const existing = cart.items.find(
    (item) => item.product.toString() === input.product && item.variant === input.variant,
  );

  if (existing) {
    existing.qty += input.qty;
    if (input.note !== undefined) existing.note = input.note;
  } else {
    cart.items.push({
      product: product._id,
      qty: input.qty,
      ...(input.variant ? { variant: input.variant } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(type === 'shopping' && typeof product.price === 'number'
        ? { priceAtAdd: product.price }
        : {}),
      addedAt: new Date(),
    });
  }

  await cart.save();
  return cart;
}

export async function updateItem(
  owner: CartOwner,
  type: CartType,
  productId: string,
  patch: { qty?: number; note?: string; variant?: string },
): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);

  const item = cart.items.find(
    (entry) => entry.product.toString() === productId && entry.variant === patch.variant,
  );
  if (!item) throw ApiError.notFound('That item is not in your cart');

  if (patch.qty !== undefined) {
    const product = await loadAdmissibleProduct(productId, type);
    if (patch.qty < product.minOrderQty) {
      throw ApiError.badRequest(`Minimum order quantity is ${product.minOrderQty}`);
    }
    if (type === 'shopping' && product.stock < patch.qty) {
      throw ApiError.badRequest(`Only ${product.stock} in stock`);
    }
    item.qty = patch.qty;
  }

  if (patch.note !== undefined) item.note = patch.note;

  await cart.save();
  return cart;
}

export async function removeItem(
  owner: CartOwner,
  type: CartType,
  productId: string,
  variant?: string,
): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);
  const before = cart.items.length;

  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === productId && item.variant === variant),
  );

  if (cart.items.length === before) throw ApiError.notFound('That item is not in your cart');

  await cart.save();
  return cart;
}

export async function clearCart(owner: CartOwner, type: CartType): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);
  cart.items = [];
  await cart.save();
  return cart;
}

/**
 * Fold a guest's carts into their account at login/registration.
 * Quantities are summed for products present in both; the guest cart is then
 * deleted so the session cookie can be retired.
 */
export async function mergeGuestCarts(sessionId: string | null, userId: string): Promise<void> {
  if (!sessionId) return;

  try {
    const guestCarts = await Cart.find({ sessionId });

    for (const guestCart of guestCarts) {
      if (guestCart.items.length === 0) {
        await guestCart.deleteOne();
        continue;
      }

      const userCart = await getOrCreateCart({ user: userId, sessionId: null }, guestCart.type);

      for (const guestItem of guestCart.items) {
        const match = userCart.items.find(
          (item) =>
            item.product.toString() === guestItem.product.toString() &&
            item.variant === guestItem.variant,
        );
        if (match) match.qty += guestItem.qty;
        else userCart.items.push(guestItem);
      }

      await userCart.save();
      await guestCart.deleteOne();
    }
  } catch (error) {
    // A merge failure must never block sign-in.
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[cart] Guest cart merge failed for session ${sessionId}: ${message}`);
  }
}
