import type { Request, Response } from 'express';
import * as catalog from '../services/catalog.service';
import { sendSuccess } from '../utils/ApiResponse';
import type { ProductQuery } from '../validators';

/** Public product endpoints. `costPrice` is `select: false` and never projected. */

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ProductQuery;
  const { items, meta, facets } = await catalog.listProducts(query);

  sendSuccess(res, { items, meta, facets }, `${meta.total} product(s) found`);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const { product, related } = await catalog.getProductBySlug(slug);

  sendSuccess(res, { product, related }, 'Product detail');
}

export async function getSimilar(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { limit } = req.query as unknown as { limit: number };

  const items = await catalog.getSimilarProducts(id, limit);
  sendSuccess(res, items, `${items.length} similar product(s)`);
}

export async function suggest(req: Request, res: Response): Promise<void> {
  const { q, limit } = req.query as unknown as { q: string; limit: number };

  const items = await catalog.suggest(q, limit);
  sendSuccess(res, items, `${items.length} suggestion(s)`);
}
