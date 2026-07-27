import { Router } from 'express';
import { inquiryCartController, shoppingCartController } from '../controllers/cart.controller';
import { optionalAuth, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  addCartItemSchema,
  cartItemParamSchema,
  cartItemQuerySchema,
  updateCartItemSchema,
} from '../validators';
import type { CartType } from '../types';

/**
 * One router factory drives both carts:
 *   /cart/items    -> shopping cart -> checkout -> Order
 *   /inquiry/items -> inquiry cart  -> RFQ      -> Quotation
 *
 * `optionalAuth` means guests work everywhere; the controller falls back to the
 * `ft_session_id` cookie when there is no signed-in user.
 */
export function createCartRouter(type: CartType): Router {
  const controller = type === 'shopping' ? shoppingCartController : inquiryCartController;
  const router: Router = Router();

  router.use(optionalAuth);

  router.get('/', asyncHandler(controller.get));
  router.get('/items', asyncHandler(controller.get));

  router.post(
    '/items',
    validate({ body: addCartItemSchema }),
    asyncHandler(controller.add),
  );

  router.patch(
    '/items/:productId',
    validate({
      params: cartItemParamSchema,
      query: cartItemQuerySchema,
      body: updateCartItemSchema,
    }),
    asyncHandler(controller.update),
  );

  router.delete(
    '/items/:productId',
    validate({ params: cartItemParamSchema, query: cartItemQuerySchema }),
    asyncHandler(controller.remove),
  );

  router.delete('/items', asyncHandler(controller.clear));

  return router;
}
