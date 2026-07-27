import { Router } from 'express';
import { suggest } from '../controllers/product.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { suggestQuerySchema } from '../validators';

const router: Router = Router();

/** Fast autocomplete over name, SKU and manufacturer part number. */
router.get('/suggest', validate({ query: suggestQuerySchema }), asyncHandler(suggest));

export default router;
