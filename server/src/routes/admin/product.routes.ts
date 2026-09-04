import { Router } from 'express';
import * as products from '../../controllers/admin/product.controller';
import * as media from '../../controllers/admin/product.media.controller';
import { mediaUpload, uploadProductImages, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminProductQuerySchema,
  bulkProductSchema,
  createProductSchema,
  exportQuerySchema,
  idParamSchema,
  imageParamSchema,
  stockAdjustmentSchema,
  updateProductSchema,
} from '../../validators';

const router: Router = Router();

/* Static paths are declared before `/:id` so they are not shadowed. */

router.get('/export', validate({ query: exportQuerySchema }), asyncHandler(media.exportToSheet));

router.post(
  '/import',
  // Accepts CSV and XLSX; `?dryRun=true` returns the report without writing.
  mediaUpload.single('file'),
  asyncHandler(media.importFromSheet),
);

router.post('/bulk', validate({ body: bulkProductSchema }), asyncHandler(products.bulkUpdate));

router.get('/', validate({ query: adminProductQuerySchema }), asyncHandler(products.listProducts));
router.post('/', validate({ body: createProductSchema }), asyncHandler(products.createProduct));

router.get('/:id', validate({ params: idParamSchema }), asyncHandler(products.getProduct));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(products.updateProduct),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(products.deleteProduct));

/*
 * Permanent, unlike the route above. Kept on its own path so that nothing can
 * reach it by accident: a client that means to hide a product and gets the URL
 * slightly wrong hides it, rather than destroying it.
 */
router.delete(
  '/:id/permanent',
  validate({ params: idParamSchema }),
  asyncHandler(products.purgeProduct),
);

router.patch(
  '/:id/stock',
  validate({ params: idParamSchema, body: stockAdjustmentSchema }),
  asyncHandler(products.adjustStock),
);

router.post(
  '/:id/images',
  validate({ params: idParamSchema }),
  uploadProductImages,
  asyncHandler(media.uploadImages),
);
router.delete(
  '/:id/images/:publicId',
  validate({ params: imageParamSchema }),
  asyncHandler(media.removeImage),
);

export default router;
