import type { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Category, Product, type ICategory } from '../models';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';

/** Category tree and detail endpoints. */

type LeanCategory = ICategory & { _id: Types.ObjectId };

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  level: number;
  displayOrder: number;
  isFeatured: boolean;
  productCount: number;
  children: CategoryNode[];
}

/** Count active products per category, including products in child categories. */
async function productCounts(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId | null; count: number }>([
    { $match: { isActive: true } },
    {
      $facet: {
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        bySub: [{ $match: { subCategory: { $ne: null } } }, { $group: { _id: '$subCategory', count: { $sum: 1 } } }],
      },
    },
    { $project: { rows: { $concatArrays: ['$byCategory', '$bySub'] } } },
    { $unwind: '$rows' },
    { $group: { _id: '$rows._id', count: { $sum: '$rows.count' } } },
  ]);

  return new Map(rows.filter((row) => row._id !== null).map((row) => [String(row._id), row.count]));
}

/** Assemble a flat category list into a nested tree. */
function buildTree(
  categories: LeanCategory[],
  counts: Map<string, number>,
  includeEmpty: boolean,
): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();

  for (const category of categories) {
    nodes.set(category._id.toString(), {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      ...(category.description ? { description: category.description } : {}),
      ...(category.icon ? { icon: category.icon } : {}),
      ...(category.image ? { image: category.image } : {}),
      level: category.level,
      displayOrder: category.displayOrder,
      isFeatured: category.isFeatured,
      productCount: counts.get(category._id.toString()) ?? 0,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category._id.toString());
    if (!node) continue;

    const parent = category.parent ? nodes.get(category.parent.toString()) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // A parent's count rolls up its children so the nav never reads "0".
  const rollUp = (node: CategoryNode): number => {
    const childTotal = node.children.reduce((sum, child) => sum + rollUp(child), 0);
    node.productCount = Math.max(node.productCount, childTotal);
    return node.productCount;
  };
  roots.forEach(rollUp);

  const prune = (list: CategoryNode[]): CategoryNode[] =>
    list
      .filter((node) => includeEmpty || node.productCount > 0)
      .map((node) => ({ ...node, children: prune(node.children) }));

  return prune(roots);
}

export async function getCategoryTree(req: Request, res: Response): Promise<void> {
  const { includeEmpty, featuredOnly } = req.query as unknown as {
    includeEmpty: boolean;
    featuredOnly: boolean;
  };

  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) })
      .sort({ level: 1, displayOrder: 1, name: 1 })
      .lean<LeanCategory[]>(),
    productCounts(),
  ]);

  const tree = buildTree(categories, counts, includeEmpty);
  sendSuccess(res, tree, `${tree.length} root categor(ies)`);
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };

  const category = await Category.findOne({ slug, isActive: true })
    .populate({ path: 'ancestors', select: 'name slug' })
    .lean<LeanCategory>();

  if (!category) throw ApiError.notFound('Category not found');

  const [children, counts] = await Promise.all([
    Category.find({ parent: category._id, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean<LeanCategory[]>(),
    productCounts(),
  ]);

  sendSuccess(
    res,
    {
      category,
      breadcrumbs: category.ancestors,
      children: children.map((child) => ({
        ...child,
        productCount: counts.get(child._id.toString()) ?? 0,
      })),
      productCount: counts.get(category._id.toString()) ?? 0,
    },
    'Category detail',
  );
}
