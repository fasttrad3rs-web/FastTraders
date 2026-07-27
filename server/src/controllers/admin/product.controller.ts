import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { Product, type IProduct } from '../../models';
import { recordAudit } from '../../services/audit.service';
import * as admin from '../../services/product.admin.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { buildMeta, toSkip } from '../../utils/pagination';
import type {
  AdminProductQuery,
  BulkProductInput,
  CreateProductInput,
  StockAdjustmentInput,
  UpdateProductInput,
} from '../../validators';

/** Admin catalogue management. Unlike the public API, `costPrice` is included. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  stock_asc: { stock: 1 },
  stock_desc: { stock: -1 },
  sales: { salesCount: -1 },
};

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as AdminProductQuery;

  const filter: FilterQuery<IProduct> = {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.brand ? { brand: query.brand } : {}),
    ...(query.pricingMode ? { pricingMode: query.pricingMode } : {}),
    ...(query.tags && query.tags.length > 0 ? { tags: { $all: query.tags } } : {}),
    ...(query.outOfStock ? { stock: { $lte: 0 } } : {}),
    // "Low stock" means at or under the per-product threshold, but not yet zero.
    ...(query.lowStock
      ? { stock: { $gt: 0 }, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }
      : {}),
  };

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { sku: term }, { partNumber: term }];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select('+costPrice')
      .populate({ path: 'category', select: 'name slug' })
      .populate({ path: 'brand', select: 'name slug' })
      .sort(SORTS[query.sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, query.page, query.limit) }, `${total} product(s)`);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const product = await Product.findById(id)
    .select('+costPrice')
    .populate({ path: 'category subCategory', select: 'name slug' })
    .populate({ path: 'brand', select: 'name slug' });

  if (!product) throw ApiError.notFound('Product not found');
  sendSuccess(res, product.toJSON(), 'Product detail');
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const product = await admin.createProduct(req.body as CreateProductInput);

  recordAudit({
    req,
    action: 'create',
    entity: 'Product',
    entityId: product._id.toString(),
    after: { sku: product.sku, name: product.name },
  });

  sendCreated(res, product.toJSON(), `Product "${product.name}" created`);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const before = await Product.findById(id).select('+costPrice').lean();

  const product = await admin.updateProduct(id, req.body as UpdateProductInput);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    before: before ?? undefined,
    after: product.toObject() as unknown as Record<string, unknown>,
  });

  sendSuccess(res, product.toJSON(), 'Product updated');
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const product = await admin.softDeleteProduct(id);

  recordAudit({ req, action: 'delete', entity: 'Product', entityId: id, after: { isActive: false } });

  sendSuccess(
    res,
    product.toJSON(),
    'Product deactivated. Order history and links continue to resolve.',
  );
}

export async function bulkUpdate(req: Request, res: Response): Promise<void> {
  const input = req.body as BulkProductInput;
  const result = await admin.bulkUpdate(input);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: `bulk:${input.ids.length}`,
    after: { ...result, ids: input.ids },
  });

  sendSuccess(res, result, `${result.modified} product(s) updated`);
}

export async function adjustStock(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as StockAdjustmentInput;

  const { product, previous, next } = await admin.adjustStock(id, input);

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    before: { stock: previous },
    after: { stock: next, mode: input.mode, quantity: input.quantity, reason: input.reason },
  });

  sendSuccess(
    res,
    { sku: product.sku, previous, current: next, stockStatus: product.stockStatus },
    `Stock updated from ${previous} to ${next}`,
  );
}
