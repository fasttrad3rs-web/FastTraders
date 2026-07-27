import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env before anything else touches process.env.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Comma-separated origin list -> trimmed, non-empty string array. */
const originListSchema = z
  .string()
  .min(1, 'CLIENT_URL is required')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
  .refine((origins) => origins.length > 0, 'CLIENT_URL must contain at least one origin');

/** JWT duration strings such as `15m`, `7d`, `12h`, or a raw seconds value. */
const durationSchema = z
  .string()
  .regex(/^\d+(?:[smhdw])?$/, 'Expected a duration like 15m, 24h, 7d or a number of seconds');

const envSchema = z.object({
  /* ---------------------------- Core ---------------------------- */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  /* -------------------------- Database -------------------------- */
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGO_URI must start with mongodb:// or mongodb+srv://',
    ),

  /* ---------------------------- Auth ---------------------------- */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_EXPIRY: durationSchema.default('15m'),
  REFRESH_EXPIRY: durationSchema.default('7d'),

  /* ---------------------------- CORS ---------------------------- */
  CLIENT_URL: originListSchema,

  /* ------------------------- Cloudinary ------------------------- */
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_FOLDER: z.string().default('fast-traders'),

  /* ---------------------------- SMTP ---------------------------- */
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),

  /* -------------------------- Payments -------------------------- */
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  /* ----------------------------- Ops ---------------------------- */
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email address'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // The logger depends on env, so this one message must use the raw console.
  // eslint-disable-next-line no-console
  console.error(
    `\n[env] Invalid server environment configuration:\n${details}\n\n` +
      `Copy server/.env.example to server/.env and fill in the missing values.\n`,
  );
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
