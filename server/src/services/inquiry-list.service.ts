import type { Types } from 'mongoose';
import { InquiryList, Product, type IProduct, type InquiryListDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import type { Availability } from '../types';

/**
 * The inquiry list — a shortlist of products a visitor wants priced.
 *
 * Keyed on the guest session cookie and nothing else, because there are no
 * accounts to merge into. No price field is selected anywhere in this file,
 * so none can leak: a hydrated line carries availability and lead time, which
 * is what a buyer needs before asking.
 */

export async function getOrCreate(sessionId: string): Promise<InquiryListDocument> {
  if (!sessionId) throw ApiError.badRequest('No inquiry list session was found');

  const existing = await InquiryList.findOne({ sessionId });
  if (existing) return existing;

  const list = new InquiryList({ sessionId });
  await list.save();
  return list;
}

export interface AddItemInput {
  product: string;
  qty: number;
  note?: string;
}

export async function addItem(
  sessionId: string,
  input: AddItemInput,
): Promise<InquiryListDocument> {
  const product = await Product.findById(input.product).lean<IProduct & { _id: Types.ObjectId }>();
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  const list = await getOrCreate(sessionId);
  const existing = list.items.find((item) => item.product.toString() === input.product);

  if (existing) {
    existing.qty += input.qty;
    if (input.note !== undefined) existing.note = input.note;
  } else {
    list.items.push({
      product: product._id,
      qty: input.qty,
      ...(input.note ? { note: input.note } : {}),
      addedAt: new Date(),
    });
  }

  await list.save();
  return list;
}

export async function updateItem(
  sessionId: string,
  productId: string,
  patch: { qty?: number; note?: string },
): Promise<InquiryListDocument> {
  const list = await getOrCreate(sessionId);
  const item = list.items.find((entry) => entry.product.toString() === productId);
  if (!item) throw ApiError.notFound('That item is not on your list');

  // Quantity is an indication of interest, not an order line — the only rule
  // is that it stays a positive whole number.
  if (patch.qty !== undefined) item.qty = Math.max(1, Math.round(patch.qty));
  if (patch.note !== undefined) item.note = patch.note;

  await list.save();
  return list;
}

export async function removeItem(
  sessionId: string,
  productId: string,
): Promise<InquiryListDocument> {
  const list = await getOrCreate(sessionId);
  const before = list.items.length;

  list.items = list.items.filter((item) => item.product.toString() !== productId);
  if (list.items.length === before) throw ApiError.notFound('That item is not on your list');

  await list.save();
  return list;
}

export async function clear(sessionId: string): Promise<InquiryListDocument> {
  const list = await getOrCreate(sessionId);
  list.items = [];
  await list.save();
  return list;
}

export interface HydratedLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  partNumber?: string;
  brand?: string;
  image?: string;
  unit: string;
  qty: number;
  note?: string;
  /** Imported items carry a longer lead time in the reply. */
  availability: Availability;
  leadTime?: string;
  isAvailable: boolean;
}

export interface InquiryListSummary {
  items: HydratedLine[];
  itemCount: number;
  lineCount: number;
}

/** Hydrate for display. */
export async function hydrate(list: InquiryListDocument): Promise<InquiryListSummary> {
  const ids = list.items.map((item) => item.product);

  const products = await Product.find({ _id: { $in: ids } })
    .select('name slug sku partNumber unit images isActive availability leadTime brand')
    .populate({ path: 'brand', select: 'name' })
    .lean<(IProduct & { _id: Types.ObjectId; brand?: { name?: string } })[]>();

  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items: HydratedLine[] = [];
  for (const entry of list.items) {
    const product = byId.get(entry.product.toString());
    if (!product) continue;

    items.push({
      product: product._id.toString(),
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      ...(product.partNumber ? { partNumber: product.partNumber } : {}),
      ...(product.brand?.name ? { brand: product.brand.name } : {}),
      ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
      unit: product.unit,
      qty: entry.qty,
      ...(entry.note ? { note: entry.note } : {}),
      availability: product.availability ?? 'available_on_order',
      ...(product.leadTime ? { leadTime: product.leadTime } : {}),
      isAvailable: product.isActive && product.availability !== 'discontinued',
    });
  }

  return {
    items,
    itemCount: items.reduce((sum, line) => sum + line.qty, 0),
    lineCount: items.length,
  };
}
