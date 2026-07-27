import { Router } from 'express';
import * as orders from '../controllers/order.controller';
import { optionalAuth, protect, publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  cancelOrderSchema,
  createOrderSchema,
  idParamSchema,
  myOrdersQuerySchema,
  orderNumberParamSchema,
} from '../validators';

const router: Router = Router();

/** Guest checkout is allowed, so this is `optionalAuth` rather than `protect`. */
router.post(
  '/',
  optionalAuth,
  publicWriteLimiter,
  validate({ body: createOrderSchema }),
  asyncHandler(orders.createOrder),
);

router.get(
  '/my',
  protect,
  validate({ query: myOrdersQuerySchema }),
  asyncHandler(orders.listMyOrders),
);

router.post(
  '/:id/cancel',
  protect,
  validate({ params: idParamSchema, body: cancelOrderSchema }),
  asyncHandler(orders.cancelOrder),
);

/** Guests may look up an order by number plus the email used at checkout. */
router.get(
  '/:orderNumber',
  optionalAuth,
  validate({ params: orderNumberParamSchema }),
  asyncHandler(orders.getOrder),
);

export default router;
