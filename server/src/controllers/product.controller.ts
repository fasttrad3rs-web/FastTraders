import type { Request, Response } from 'express';
import * as catalog from '../services/catalog.service';
import { toPublicProduct, toPublicProducts } from '../models/Product.public';
import { sendSuccess } from '../utils/ApiResponse';
import type { ProductQuery } from '../validators';

/**
 * Public product endpoints.
 *
 * Every response goes through `toPublicProduct`, which whitelists. Nothing
 * here hands a raw document to `sendSuccess` — that is the single rule this
 * file exists to enforce, and the Jest suite asserts it on the serialised
 * response body rather than on the code.
 */

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ProductQuery;
  const { items, meta, facets } = await catalog.listProducts(query);

  sendSuccess(
    res,
    { items: toPublicProducts(items), meta, facets },
    `${meta.total} product(s) found`,
  );
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const { product, related } = await catalog.getProductBySlug(slug);

  sendSuccess(
    res,
    { product: toPublicProduct(product), related: toPublicProducts(related) },
    'Product detail',
  );
}

export async function getSimilar(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { limit } = req.query as unknown as { limit: number };

  const items = await catalog.getSimilarProducts(id, limit);
  sendSuccess(res, toPublicProducts(items), `${items.length} similar product(s)`);
}

/**
 * Autocomplete returns its own narrow projection rather than a full product —
 * it is already a whitelist, built in the service.
 */
export async function suggest(req: Request, res: Response): Promise<void> {
  const { q, limit } = req.query as unknown as { q: string; limit: number };

  const items = await catalog.suggest(q, limit);
  sendSuccess(res, items, `${items.length} suggestion(s)`);
}
