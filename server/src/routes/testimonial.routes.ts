import { Router } from 'express';
import { listTestimonials } from '../controllers/testimonial.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router: Router = Router();

router.get('/', asyncHandler(listTestimonials));

export default router;
