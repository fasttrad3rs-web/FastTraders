import { Router } from 'express';
import * as orders from '../../controllers/admin/order.controller';
import { validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminOrderQuerySchema,
  idParamSchema,
  updateOrderStatusSchema,
  updatePaymentSchema,
  updateTrackingSchema,
} from '../../validators';

const router: Router = Router();

router.get('/export', asyncHandler(orders.exportOrders));

router.get('/', validate({ query: adminOrderQuerySchema }), asyncHandler(orders.listOrders));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(orders.getOrder));

/** Renders the PDF invoice on the Fast Traders letterhead. */
router.get('/:id/invoice', validate({ params: idParamSchema }), asyncHandler(orders.downloadInvoice));

router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(orders.updateStatus),
);
router.patch(
  '/:id/payment',
  validate({ params: idParamSchema, body: updatePaymentSchema }),
  asyncHandler(orders.updatePayment),
);
router.patch(
  '/:id/tracking',
  validate({ params: idParamSchema, body: updateTrackingSchema }),
  asyncHandler(orders.updateTracking),
);

export default router;
