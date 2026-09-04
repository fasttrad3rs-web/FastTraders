import { z } from 'zod';

/** Reusable primitives shared by every validator module. */

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(160);

/**
 * Pakistani mobile or landline. Accepts +92 / 0092 / leading 0 / bare forms so
 * customers are not fighting the form on a phone keyboard.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Phone number is too short')
  .max(24)
  .regex(/^(?:\+92|0092|92|0)?\d{9,11}$/, 'Enter a valid Pakistani phone number');

/**
 * Minimum eight characters with a letter and a digit. Deliberately not a
 * symbol-and-uppercase maze — length beats complexity theatre.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const nameSchema = z.string().trim().min(2, 'Name is too short').max(120);

/** National Tax Number (7+1 digits) or CNIC (13 digits). */
/** Standard page/limit query, coerced from strings. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

/** `a,b,c` -> `['a','b','c']`, trimmed and de-duplicated. */
export const csvSchema = z
  .string()
  .transform((value) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]);

/**
 * Query-string boolean. The union (rather than a bare enum + transform) keeps
 * `boolean` in the *input* type, so `.default(true)` type-checks downstream.
 */
export const booleanQuerySchema = z.union([
  z.boolean(),
  z.enum(['true', 'false', '1', '0']).transform((value) => value === 'true' || value === '1'),
]);

/**
 * An image reference: either an absolute http(s) URL (Cloudinary, in practice)
 * or a root-relative path into `client/public`.
 *
 * A bare `z.string().url()` rejects the second form, which meant a seeded
 * banner using the bundled placeholder artwork could be viewed in the admin
 * but not saved — the update 422'd on a field the operator had not touched.
 */
export const imageRefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^https?:\/\//.test(value) || /^\/[^/]/.test(value),
    'Must be an https URL or a root-relative path such as /placeholders/x.svg',
  );

export const idParamSchema = z.object({ id: objectIdSchema });
export const slugParamSchema = z.object({ slug: slugSchema });
export const tokenParamSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid or malformed token'),
});
