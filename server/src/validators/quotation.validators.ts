import { z } from 'zod';
import { customerDetailsSchema } from './order.validators';

export const createQuotationSchema = z.object({
  customer: customerDetailsSchema,
  message: z.string().trim().max(2000).optional(),
  /** Buyer's required-by date; must be in the future. */
  requiredBy: z.coerce
    .date()
    .refine((date) => date.getTime() > Date.now(), 'Required-by date must be in the future')
    .optional(),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const quoteNumberParamSchema = z.object({
  quoteNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^FTQ-\d{6}-\d{4,}$/, 'Invalid quotation number'),
});

/**
 * Customer-side response to a priced quotation.
 * `counter` keeps the negotiation on record without an admin round trip.
 */
export const respondQuotationSchema = z
  .object({
    action: z.enum(['accept', 'reject', 'counter']),
    message: z.string().trim().max(2000).optional(),
  })
  .refine(
    (data) => data.action !== 'counter' || (data.message !== undefined && data.message.length > 0),
    { message: 'A counter-offer needs a message explaining what you want', path: ['message'] },
  );
export type RespondQuotationInput = z.infer<typeof respondQuotationSchema>;

export const myQuotationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z
    .enum(['new', 'reviewing', 'quoted', 'negotiating', 'accepted', 'rejected', 'expired', 'converted'])
    .optional(),
});
