import { z } from 'zod';

/**
 * Client environment validation.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when it is
 * referenced *statically*, so every variable must be written out in full below —
 * destructuring or dynamic access would silently produce `undefined`.
 *
 * Parsing runs at module load. A missing or malformed variable throws during
 * the build (or on first render in dev), which is exactly what we want:
 * fail fast, never ship a half-configured site.
 */
const clientEnvSchema = z.object({
  /** Express API base URL, including the `/api/v1` version prefix. */
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),

  /** Canonical public site URL — used for SEO metadata, sitemap and OG tags. */
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL'),

  /** WhatsApp number, international format, digits only (e.g. 923244234990). */
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, 'NEXT_PUBLIC_WHATSAPP_NUMBER must be 10-15 digits, no + or spaces'),

});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `\n[env] Invalid client environment configuration:\n${details}\n\n` +
      `Copy client/.env.example to client/.env.local and fill in the missing values.\n`,
  );
}

export const env: ClientEnv = parsed.data;

/** Convenience flags. */
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
