import { Router } from 'express';
import * as categories from '../controllers/category.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { categoryTreeQuerySchema, slugParamSchema } from '../validators';

const router: Router = Router();

router.get(
  '/',
  validate({ query: categoryTreeQuerySchema }),
  asyncHandler(categories.getCategoryTree),
);
router.get('/:slug', validate({ params: slugParamSchema }), asyncHandler(categories.getCategory));

export default router;
