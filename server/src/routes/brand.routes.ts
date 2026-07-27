import { Router } from 'express';
import { listBrands } from '../controllers/brand.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { brandQuerySchema } from '../validators';

const router: Router = Router();

router.get('/', validate({ query: brandQuerySchema }), asyncHandler(listBrands));

export default router;
