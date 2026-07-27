import { z } from 'zod';
import { addressSchema, emailSchema, nameSchema, phoneSchema } from './common.validators';

export const customerDetailsSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  companyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

export const createOrderSchema = z
  .object({
    customer: customerDetailsSchema,
    shippingAddress: addressSchema,
    /** Omit when `sameAsBilling` is true. */
    billingAddress: addressSchema.optional(),
    sameAsBilling: z.boolean().default(true),
    paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']),
    couponCode: z.string().trim().toUpperCase().max(32).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => data.sameAsBilling || data.billingAddress !== undefined,
    { message: 'A billing address is required when it differs from shipping', path: ['billingAddress'] },
  );
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderNumberParamSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^FT-\d{6}-\d{4,}$/, 'Invalid order number'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .optional(),
});
