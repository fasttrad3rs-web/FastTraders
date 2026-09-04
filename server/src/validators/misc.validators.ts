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

/* ----------------------------- Testimonials ------------------------------ */

export const createTestimonialSchema = z.object({
  quote: z.string().trim().min(10, 'Quote is too short').max(1000),
  author: z.string().trim().min(2).max(120),
  role: z.string().trim().max(120).optional(),
  company: z.string().trim().max(160).optional(),
  product: objectIdSchema.nullable().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isPublished: z.boolean().default(false),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
});
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

/*
 * Explicit, not `.partial()`. See `updateBrandSchema` — optional-but-not-
 * nullable means the admin can set a role or a rating and never remove one.
 */
export const updateTestimonialSchema = z
  .object({
    quote: z.string().trim().min(10, 'Quote is too short').max(1000).optional(),
    author: z.string().trim().min(2).max(120).optional(),
    role: z.string().trim().max(120).nullable().optional(),
    company: z.string().trim().max(160).nullable().optional(),
    product: objectIdSchema.nullable().optional(),
    rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
    isPublished: z.boolean().optional(),
    displayOrder: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const testimonialQuerySchema = paginationSchema.extend({
  product: objectIdSchema.optional(),
  isPublished: booleanQuerySchema.optional(),
});
