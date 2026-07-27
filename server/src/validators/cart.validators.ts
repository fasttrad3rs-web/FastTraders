import { z } from 'zod';
import { objectIdSchema } from './common.validators';

/**
 * Both carts share these shapes; the route decides whether it is operating on
 * the `shopping` or the `inquiry` cart.
 */

export const addCartItemSchema = z.object({
  product: objectIdSchema,
  qty: z.coerce.number().int().positive().max(9999).default(1),
  variant: z.string().trim().max(80).optional(),
  /** Buyer note — only meaningful on the inquiry cart. */
  note: z.string().trim().max(500).optional(),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z
  .object({
    qty: z.coerce.number().int().positive().max(9999).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide qty or note');
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartItemParamSchema = z.object({
  productId: objectIdSchema,
});

export const cartItemQuerySchema = z.object({
  variant: z.string().trim().max(80).optional(),
});
