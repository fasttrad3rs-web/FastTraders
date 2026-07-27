import { z } from 'zod';

/**
 * Shared Zod schemas used by React Hook Form and by the typed API client.
 * Kept intentionally small in Phase 1 — feature schemas are added alongside
 * their features.
 */

/** Pakistani mobile/landline, tolerant of +92, 0092 and local 0xxx formats. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+92|0092|0)?3\d{9}$|^(?:\+92|0092|0)?\d{2,3}\d{7,8}$/, 'Enter a valid Pakistani phone number');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

/** Generic pagination query used across catalogue endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
