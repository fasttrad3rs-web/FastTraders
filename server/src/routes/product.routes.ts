import { Router } from 'express';
import * as products from '../controllers/product.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  idParamSchema,
  productQuerySchema,
  similarQuerySchema,
  slugParamSchema,
} from '../validators';

const router: Router = Router();

/** Faceted catalogue listing. */
router.get('/', validate({ query: productQuerySchema }), asyncHandler(products.listProducts));

/** Similar products by id — registered before `/:slug` so it is not shadowed. */
router.get(
  '/:id/similar',
  validate({ params: idParamSchema, query: similarQuerySchema }),
  asyncHandler(products.getSimilar),
);

router.get('/:slug', validate({ params: slugParamSchema }), asyncHandler(products.getProduct));

export default router;
