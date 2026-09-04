import { Router } from 'express';
import { Testimonial } from '../../models';
import { makeCrudController } from '../../controllers/admin/taxonomy.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { createTestimonialSchema, idParamSchema, updateTestimonialSchema } from '../../validators';

/** Admin testimonial CRUD, reusing the shared taxonomy controller factory. */
const controller = makeCrudController({
  model: Testimonial,
  label: 'Testimonial',
  tag: 'testimonials',
  listSort: { displayOrder: 1, createdAt: -1 },
});

const router: Router = Router();

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: createTestimonialSchema }), asyncHandler(controller.create));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.get));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTestimonialSchema }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));

export default router;
