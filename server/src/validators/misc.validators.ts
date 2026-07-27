import { z } from 'zod';
import {
  booleanQuerySchema,
  emailSchema,
  nameSchema,
  objectIdSchema,
  paginationSchema,
  phoneSchema,
} from './common.validators';

/* -------------------------------- Contact -------------------------------- */

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().trim().min(3, 'Subject is too short').max(200),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
  source: z
    .enum(['contact_form', 'product_page', 'whatsapp', 'phone', 'footer'])
    .default('contact_form'),
  /** Honeypot — real users never fill this. */
  website: z.string().max(0, 'Rejected').optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

/* ------------------------------- Newsletter ------------------------------ */

export const newsletterSchema = z.object({ email: emailSchema });

/* -------------------------------- Banners -------------------------------- */

export const bannerQuerySchema = z.object({
  position: z.enum(['hero', 'strip', 'sidebar']).optional(),
});

/* -------------------------------- Reviews -------------------------------- */

export const createReviewSchema = z.object({
  product: objectIdSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
  images: z.array(z.string().url()).max(4).default([]),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    title: z.string().trim().max(120).optional(),
    comment: z.string().trim().min(10).max(2000).optional(),
    images: z.array(z.string().url()).max(4).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const approveReviewSchema = z.object({
  isApproved: z.boolean(),
});

export const reviewQuerySchema = paginationSchema.extend({
  product: objectIdSchema.optional(),
  /** Admin-only: include reviews awaiting moderation. */
  includePending: booleanQuerySchema.default(false),
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
});
