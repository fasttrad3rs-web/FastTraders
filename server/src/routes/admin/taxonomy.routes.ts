import { Router } from 'express';
import {
  bannerAdmin,
  brandAdmin,
  categoryAdmin,
  couponAdmin,
  type CrudController,
} from '../../controllers/admin/taxonomy.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createBannerSchema,
  createBrandSchema,
  createCategorySchema,
  createCouponSchema,
  idParamSchema,
  reorderSchema,
  taxonomyQuerySchema,
  updateBannerSchema,
  updateBrandSchema,
  updateCategorySchema,
  updateCouponSchema,
} from '../../validators';
import type { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Categories, brands, banners and coupons all expose the same admin surface,
 * so one router factory covers the four of them.
 */
function crudRouter(
  controller: CrudController,
  schemas: { create: ZodTypeAny; update: ZodTypeAny; query?: AnyZodObject },
): Router {
  const router: Router = Router();

  // `/reorder` first — it must not be captured by `/:id`.
  router.patch('/reorder', validate({ body: reorderSchema }), asyncHandler(controller.reorder));

  router.get('/', ...(schemas.query ? [validate({ query: schemas.query })] : []), asyncHandler(controller.list));
  router.post('/', validate({ body: schemas.create }), asyncHandler(controller.create));

  router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.get));
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: schemas.update }),
    asyncHandler(controller.update),
  );
  router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

  return router;
}

export const categoryRouter = crudRouter(categoryAdmin, {
  create: createCategorySchema,
  update: updateCategorySchema,
  query: taxonomyQuerySchema,
});

export const brandRouter = crudRouter(brandAdmin, {
  create: createBrandSchema,
  update: updateBrandSchema,
  query: taxonomyQuerySchema,
});

export const bannerRouter = crudRouter(bannerAdmin, {
  create: createBannerSchema,
  update: updateBannerSchema,
  query: taxonomyQuerySchema,
});

export const couponRouter = crudRouter(couponAdmin, {
  create: createCouponSchema,
  update: updateCouponSchema,
  query: taxonomyQuerySchema,
});
