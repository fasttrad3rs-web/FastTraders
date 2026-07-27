import type { Types } from 'mongoose';
import {
  Order,
  Product,
  Quotation,
  Setting,
  type IOrderItem,
  type ISetting,
  type OrderDocument,
  type QuotationDocument,
} from '../models';
import { ApiError } from '../utils/ApiError';
import { resolveShipping } from './pricing.service';
import type { ConvertQuotationInput, PriceQuotationInput } from '../validators';

/** Admin-side quotation pricing and conversion to an order. */

/**
 * Apply per-line prices. Items are matched on SKU rather than array index, so
 * a reordered payload cannot silently price the wrong line.
 */
export async function priceQuotation(
  quotation: QuotationDocument,
  input: PriceQuotationInput,
): Promise<QuotationDocument> {
  const bySku = new Map(input.items.map((item) => [item.sku.toUpperCase(), item]));
  const unknown = [...bySku.keys()].filter(
    (sku) => !quotation.items.some((item) => item.sku.toUpperCase() === sku),
  );

  if (unknown.length > 0) {
    throw ApiError.badRequest(`These SKUs are not on this quotation: ${unknown.join(', ')}`);
  }

  for (const item of quotation.items) {
    const priced = bySku.get(item.sku.toUpperCase());
    if (!priced) continue;
    item.quotedUnitPrice = priced.quotedUnitPrice;
    if (priced.qty !== undefined) item.qty = priced.qty;
  }

  if (input.quotedTax !== undefined) quotation.quotedTax = input.quotedTax;
  if (input.validUntil) quotation.validUntil = input.validUntil;
  if (input.adminNotes) quotation.adminNotes = input.adminNotes;

  const fullyPriced = quotation.items.every((item) => typeof item.quotedUnitPrice === 'number');
  // Explicit status wins; otherwise a fully priced RFQ becomes `quoted`.
  quotation.status = input.status ?? (fullyPriced ? 'quoted' : 'reviewing');

  // The model's pre-save hook recomputes quotedSubtotal and quotedTotal.
  await quotation.save();
  return quotation;
}

/**
 * Turn an accepted quotation into an order.
 *
 * Prices come from the quotation, not the live catalogue — the customer
 * accepted those figures and they must not move underneath them.
 */
export async function convertToOrder(
  quotation: QuotationDocument,
  input: ConvertQuotationInput,
): Promise<OrderDocument> {
  if (quotation.status === 'converted' || quotation.convertedOrder) {
    throw ApiError.conflict('This quotation has already been converted to an order');
  }
  if (quotation.status !== 'accepted') {
    throw ApiError.badRequest(
      `Only an accepted quotation can be converted (current status: ${quotation.status})`,
    );
  }

  const unpriced = quotation.items.filter((item) => typeof item.quotedUnitPrice !== 'number');
  if (unpriced.length > 0) {
    throw ApiError.badRequest(
      `These lines still have no price: ${unpriced.map((item) => item.sku).join(', ')}`,
    );
  }

  const products = await Product.find({
    _id: { $in: quotation.items.map((item) => item.product) },
  })
    .select('images')
    .lean<{ _id: Types.ObjectId; images: { url: string }[] }[]>();
  const imageById = new Map(products.map((product) => [product._id.toString(), product.images[0]?.url]));

  const items: IOrderItem[] = quotation.items.map((item) => {
    const price = item.quotedUnitPrice ?? 0;
    const image = imageById.get(item.product.toString());
    return {
      product: item.product,
      name: item.name,
      sku: item.sku,
      ...(image ? { image } : {}),
      price,
      qty: item.qty,
      unit: item.unit,
      subtotal: Math.round(price * item.qty * 100) / 100,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  const address = input.shippingAddress ?? {
    label: 'Delivery',
    line1: 'To be confirmed with the customer',
    city: quotation.customer.city ?? 'Lahore',
    province: 'Punjab',
    isDefault: false,
  };

  const settings = await Setting.findOne({ key: 'global' })
    .select('shippingRules defaultTaxRate')
    .lean<Pick<ISetting, 'shippingRules' | 'defaultTaxRate'>>();

  const { cost: shippingCost } = resolveShipping(settings, address.city, subtotal);
  // Honour the tax that was quoted; fall back to the default rate.
  const taxAmount =
    quotation.quotedTax ?? Math.round((subtotal * (settings?.defaultTaxRate ?? 18)) / 100);

  const order = await Order.create({
    user: quotation.user,
    items,
    customer: quotation.customer,
    shippingAddress: address,
    billingAddress: address,
    sameAsBilling: true,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    shippingCost,
    discount: 0,
    total: Math.round((subtotal + taxAmount + shippingCost) * 100) / 100,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    notes: [`Converted from quotation ${quotation.quoteNumber}`, input.notes]
      .filter(Boolean)
      .join('\n'),
    statusHistory: [
      {
        status: 'confirmed',
        note: `Created from accepted quotation ${quotation.quoteNumber}`,
        at: new Date(),
      },
    ],
  });

  quotation.status = 'converted';
  quotation.convertedOrder = order._id;
  await quotation.save();

  return order;
}

/** Quotations whose validity window has lapsed. Called by the admin list view. */
export async function expireStaleQuotations(): Promise<number> {
  const result = await Quotation.updateMany(
    { status: { $in: ['quoted', 'negotiating'] }, validUntil: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  return result.modifiedCount;
}
