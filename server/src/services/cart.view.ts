import type { Types } from 'mongoose';
import { Product, Setting, type CartDocument, type IProduct } from '../models';
import type { CartType, ProductUnit } from '../types';

/**
 * Cart hydration and pricing.
 *
 * Line prices always come from the *current* product record, never from the
 * client. `priceChanged` tells the UI when the snapshot taken at add-to-cart
 * time no longer matches, so the customer is never surprised at checkout.
 */

export interface HydratedCartLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  unit: ProductUnit;
  qty: number;
  minOrderQty: number;
  variant?: string;
  note?: string;
  /** Absent on inquiry lines and on quote-only products. */
  price?: number;
  priceAtAdd?: number;
  priceChanged: boolean;
  subtotal?: number;
  stock: number;
  inStock: boolean;
  isAvailable: boolean;
}

export interface CartSummary {
  type: CartType;
  items: HydratedCartLine[];
  itemCount: number;
  lineCount: number;
  /** Shopping cart only. */
  subtotal: number;
  taxAmount: number;
  estimatedTotal: number;
  /** Lines whose product went inactive or out of stock since being added. */
  hasIssues: boolean;
}

type LeanProduct = IProduct & { _id: Types.ObjectId };

async function defaultTaxRate(): Promise<number> {
  const setting = await Setting.findOne({ key: 'global' }).select('defaultTaxRate').lean<{
    defaultTaxRate: number;
  }>();
  return setting?.defaultTaxRate ?? 18;
}

export async function hydrateCart(cart: CartDocument): Promise<CartSummary> {
  const ids = cart.items.map((item) => item.product);

  // `costPrice` is `select: false`, so it cannot leak through this projection.
  const products = await Product.find({ _id: { $in: ids } }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const isShopping = cart.type === 'shopping';
  const lines: HydratedCartLine[] = [];

  for (const item of cart.items) {
    const product = byId.get(item.product.toString());
    if (!product) continue; // product deleted — drop the orphan line from the view

    const price = isShopping ? product.price : undefined;
    const priceChanged =
      isShopping &&
      typeof item.priceAtAdd === 'number' &&
      typeof price === 'number' &&
      item.priceAtAdd !== price;

    lines.push({
      product: product._id.toString(),
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
      unit: product.unit,
      qty: item.qty,
      minOrderQty: product.minOrderQty,
      ...(item.variant ? { variant: item.variant } : {}),
      ...(item.note ? { note: item.note } : {}),
      ...(typeof price === 'number' ? { price, subtotal: round(price * item.qty) } : {}),
      ...(typeof item.priceAtAdd === 'number' ? { priceAtAdd: item.priceAtAdd } : {}),
      priceChanged,
      stock: product.stock,
      inStock: product.stock >= item.qty,
      isAvailable: product.isActive && (!isShopping || product.stock >= item.qty),
    });
  }

  const subtotal = round(lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0));
  const taxRate = isShopping && subtotal > 0 ? await defaultTaxRate() : 0;
  const taxAmount = round((subtotal * taxRate) / 100);

  return {
    type: cart.type,
    items: lines,
    itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
    lineCount: lines.length,
    subtotal,
    taxAmount,
    // Delivery is added at checkout once a city is known.
    estimatedTotal: round(subtotal + taxAmount),
    hasIssues: lines.some((line) => !line.isAvailable || line.priceChanged),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
