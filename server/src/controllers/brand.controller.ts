import type { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Brand, Product, type IBrand } from '../models';
import { sendSuccess } from '../utils/ApiResponse';

/** Public brand listing. */

type LeanBrand = IBrand & { _id: Types.ObjectId };

export async function listBrands(req: Request, res: Response): Promise<void> {
  const { featuredOnly, withCounts } = req.query as unknown as {
    featuredOnly: boolean;
    withCounts: boolean;
  };

  const brands = await Brand.find({ isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) })
    .sort({ displayOrder: 1, name: 1 })
    .lean<LeanBrand[]>();

  if (!withCounts) {
    sendSuccess(res, brands, `${brands.length} brand(s)`);
    return;
  }

  const rows = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id.toString(), row.count]));

  sendSuccess(
    res,
    brands.map((brand) => ({ ...brand, productCount: counts.get(brand._id.toString()) ?? 0 })),
    `${brands.length} brand(s)`,
  );
}
