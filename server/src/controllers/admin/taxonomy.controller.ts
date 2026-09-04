import { Types, type Model } from 'mongoose';
import type { Request, Response } from 'express';
import { Banner, Brand, Category, Product } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import { uniqueSlug } from '../../utils/slug';
import type { ReorderInput } from '../../validators';
import { revalidate, type CacheTag } from '../../services/revalidate.service';

/**
 * Categories, brands, banners and coupons.
 *
 * These four share the same admin shape (list / create / update / delete /
 * reorder), so the handlers are generated from one factory. Slug generation
 * and delete guards are supplied per entity.
 */

interface CrudOptions<T> {
  model: Model<T>;
  label: string;
  /*
   * Storefront cache tag to flush after a write. Without it, a hidden banner
   * or a renamed category stayed on the live site until the ISR window ran
   * out — the same lag that made the product Active toggle look broken.
   */
  tag: CacheTag;
  /** Field the slug is derived from, when the entity has one. */
  slugFrom?: 'name';
  /** Throw to block a delete (e.g. a category still holding products). */
  guardDelete?: (id: string) => Promise<void>;
  listSort?: Record<string, 1 | -1>;
}

export interface CrudController {
  list: (req: Request, res: Response) => Promise<void>;
  get: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  reorder: (req: Request, res: Response) => Promise<void>;
}

/** Narrow an unknown body value to a string before it reaches the slugger. */
function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function buildListFilter(req: Request): Record<string, unknown> {
  const { search, isActive, parent, position } = req.query as {
    search?: string;
    isActive?: boolean;
    parent?: string | null;
    position?: string;
  };

  const filter: Record<string, unknown> = {};
  if (isActive !== undefined) filter.isActive = isActive;
  if (position) filter.position = position;
  if (parent !== undefined) filter.parent = parent ? new Types.ObjectId(parent) : null;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const term = new RegExp(escaped, 'i');
    filter.$or = [{ name: term }, { title: term }, { code: term }, { slug: term }];
  }

  return filter;
}

export function makeCrudController<T>(options: CrudOptions<T>): CrudController {
  const { model, label, tag, slugFrom, guardDelete, listSort = { displayOrder: 1, name: 1 } } = options;

  return {
    list: async (req, res): Promise<void> => {
      const items = await model.find(buildListFilter(req)).sort(listSort).lean();
      sendSuccess(res, items, `${items.length} ${label}(s)`);
    },

    get: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      const item = await model.findById(id);
      if (!item) throw ApiError.notFound(`${label} not found`);
      sendSuccess(res, item.toJSON(), `${label} detail`);
    },

    create: async (req, res): Promise<void> => {
      const input = req.body as Record<string, unknown>;

      if (slugFrom && !input.slug) {
        input.slug = await uniqueSlug(model, asText(input[slugFrom]));
      }

      const created = await model.create(input);
      const id = String((created as unknown as { _id: Types.ObjectId })._id);

      recordAudit({ req, action: 'create', entity: label, entityId: id, after: input });
      revalidate([tag]);
      sendCreated(res, created, `${label} created`);
    },

    update: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      const input = req.body as Record<string, unknown>;

      const existing = await model.findById(id);
      if (!existing) throw ApiError.notFound(`${label} not found`);
      const before = existing.toObject() as Record<string, unknown>;

      // Renaming regenerates the slug unless one was supplied explicitly.
      if (slugFrom && input[slugFrom] && !input.slug) {
        input.slug = await uniqueSlug(model, asText(input[slugFrom]), id);
      }

      for (const [key, value] of Object.entries(input)) {
        existing.set(key, value === null ? undefined : value);
      }
      await existing.save();

      recordAudit({ req, action: 'update', entity: label, entityId: id, before, after: input });
      revalidate([tag]);
      sendSuccess(res, existing.toJSON(), `${label} updated`);
    },

    remove: async (req, res): Promise<void> => {
      const { id } = req.params as { id: string };
      if (guardDelete) await guardDelete(id);

      const deleted = await model.findByIdAndDelete(id);
      if (!deleted) throw ApiError.notFound(`${label} not found`);

      recordAudit({ req, action: 'delete', entity: label, entityId: id });
      revalidate([tag]);
      sendSuccess(res, null, `${label} deleted`);
    },

    /** Drag-and-drop: the client posts every affected id with its new index. */
    reorder: async (req, res): Promise<void> => {
      const { items } = req.body as ReorderInput;

      // One round trip regardless of how many rows the admin dragged.
      await model.bulkWrite(
        items.map((item) => ({
          updateOne: {
            filter: { _id: new Types.ObjectId(item.id) },
            update: { $set: { displayOrder: item.displayOrder } },
          },
        })) as Parameters<typeof model.bulkWrite>[0],
      );

      recordAudit({
        req,
        action: 'update',
        entity: label,
        entityId: `reorder:${items.length}`,
        after: { items },
      });

      revalidate([tag]);
      sendSuccess(res, null, `${items.length} ${label}(s) reordered`);
    },
  };
}

/* ------------------------------ Delete guards ---------------------------- */

async function guardCategoryDelete(id: string): Promise<void> {
  const [children, products] = await Promise.all([
    Category.countDocuments({ parent: id }),
    Product.countDocuments({ $or: [{ category: id }, { subCategory: id }] }),
  ]);

  if (children > 0) {
    throw ApiError.conflict(`Move or delete the ${children} sub-categor(ies) first`);
  }
  if (products > 0) {
    throw ApiError.conflict(
      `${products} product(s) still use this category. Reassign them before deleting.`,
    );
  }
}

async function guardBrandDelete(id: string): Promise<void> {
  const products = await Product.countDocuments({ brand: id });
  if (products > 0) {
    throw ApiError.conflict(
      `${products} product(s) still use this brand. Reassign them before deleting.`,
    );
  }
}

export const categoryAdmin = makeCrudController({
  model: Category,
  label: 'Category',
  tag: 'categories',
  slugFrom: 'name',
  guardDelete: guardCategoryDelete,
  listSort: { level: 1, displayOrder: 1, name: 1 },
});

export const brandAdmin = makeCrudController({
  model: Brand,
  label: 'Brand',
  tag: 'brands',
  slugFrom: 'name',
  guardDelete: guardBrandDelete,
});

export const bannerAdmin = makeCrudController({
  model: Banner,
  label: 'Banner',
  tag: 'banners',
  listSort: { position: 1, displayOrder: 1 },
});
