# Fast Traders — Phase 3 source dump

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

Every route, controller, service, middleware and validator built in Phase 3,
plus the Phase 1 middleware and utils they build on.
Total files: 67

---

## `server/src/app.ts`

```ts
import express, { type Application, type Request } from 'express';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import { morganStream } from './config/logger';
import { apiLimiter, errorHandler, notFound, requestId, sanitizeRequest } from './middleware';
import v1Routes from './routes';

/**
 * Express application factory.
 * Kept free of `listen()` and database concerns so it can be imported directly
 * by integration tests.
 */
export function createApp(): Application {
  const app = express();

  // Behind Vercel/Railway/Render proxies — required for correct req.ip and
  // for `secure` cookies to be issued.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  /* ----------------------------- Security ----------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  const allowedOrigins = new Set(env.CLIENT_URL);

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Allow same-origin / non-browser clients (curl, health checks, mobile).
      if (!origin) return callback(null, true);
      const normalised = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalised)) return callback(null, true);
      return callback(new Error(`Origin "${origin}" is not allowed by CORS`));
    },
    credentials: true, // httpOnly auth cookies must cross origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  };

  app.use(cors(corsOptions));

  /* ---------------------------- Observability -------------------------- */
  app.use(requestId);

  morgan.token('id', (req: Request) => req.requestId ?? '-');
  app.use(
    morgan(
      isProduction
        ? ':id :remote-addr :method :url :status :res[content-length] - :response-time ms'
        : ':method :url :status - :response-time ms',
      { stream: morganStream },
    ),
  );

  /* ------------------------------ Parsers ------------------------------ */
  // Stripe signature verification needs the untouched raw body, so the webhook
  // route is registered with express.raw() before the JSON parser in Phase 6.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Strip `$`-prefixed and dotted keys so a JSON body cannot smuggle Mongo
  // operators into a query. Must run after the parsers, before any route.
  app.use(sanitizeRequest);

  /* ------------------------------ Routes ------------------------------- */
  app.use('/api', apiLimiter);
  app.use('/api/v1', v1Routes);

  // Root ping — keeps platform health checks off the rate-limited /api tree.
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Fast Traders API. See /api/v1/health.',
      data: null,
    });
  });

  /* ------------------------- Errors (must be last) --------------------- */
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

## `server/src/server.ts`

```ts
import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { verifyMailer } from './services/email';

/**
 * Entrypoint: validate env (side effect of importing ./config/env) → connect to
 * MongoDB → start HTTP server → wire graceful shutdown.
 */

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[server] ${signal} received — shutting down gracefully`);

  // Hard exit if something hangs (open sockets, stuck query).
  const forceExit = setTimeout(() => {
    logger.error('[server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('[server] HTTP server closed');
    }

    await disconnectDatabase();
    clearTimeout(forceExit);
    logger.info('[server] Shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[server] Error during shutdown: ${message}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Non-fatal: a bad SMTP config logs loudly but must not stop the API.
  await verifyMailer();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`[server] Fast Traders API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`[server] Allowed origins: ${env.CLIENT_URL.join(', ')}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`[server] Port ${env.PORT} is already in use`);
      process.exit(1);
    }
    throw error;
  });

  // Give slow 3G clients room to finish; must exceed the proxy's idle timeout.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

/* ------------------------- Process-level handlers ------------------------- */

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.stack : String(reason);
  logger.error(`[process] Unhandled promise rejection: ${message}`);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`[process] Uncaught exception: ${error.stack ?? error.message}`);
  void shutdown('uncaughtException', 1);
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);
  logger.error(`[server] Failed to start: ${message}`);
  process.exit(1);
});
```

## `server/src/middleware/sanitize.ts`

```ts
import type { NextFunction, Request, Response } from 'express';

/**
 * NoSQL-injection guard.
 *
 * Mongo treats `{ email: { $ne: null } }` as an operator, so a JSON body of
 * `{"email": {"$ne": null}}` would otherwise match any user. This strips every
 * key that begins with `$` or contains a `.` from the body, query and params
 * before a controller can see it.
 *
 * Runs after the JSON parser and before validation.
 */

const FORBIDDEN_KEY = /^\$|\./;

function scrub(value: unknown, removed: string[], depth = 0): unknown {
  // Guard against deeply nested payloads crafted to burn CPU.
  if (depth > 10) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, removed, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      if (FORBIDDEN_KEY.test(key)) {
        removed.push(key);
        continue;
      }
      clean[key] = scrub(item, removed, depth + 1);
    }
    return clean;
  }

  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  const removed: string[] = [];

  if (req.body && typeof req.body === 'object') {
    req.body = scrub(req.body, removed);
  }

  if (Object.keys(req.query).length > 0) {
    // `req.query` is getter-only in newer Express; redefine rather than assign.
    Object.defineProperty(req, 'query', {
      value: scrub(req.query, removed),
      writable: true,
      configurable: true,
    });
  }

  if (Object.keys(req.params).length > 0) {
    req.params = scrub(req.params, removed) as typeof req.params;
  }

  // Surface the attempt for the audit trail without failing the request.
  if (removed.length > 0) {
    req.sanitizedKeys = removed;
  }

  next();
}
```

## `server/src/middleware/rateLimit.ts`

```ts
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env, isTest } from '../config/env';

/**
 * Rate limiters. Behind a proxy (Railway/Render/Vercel) `trust proxy` must be
 * enabled on the app so the real client IP is used as the key.
 */

const shared = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Never throttle the test suite.
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    data: null,
  },
};

/** Applied to every `/api` route. */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/**
 * Strict limiter for credential endpoints: 5 attempts per IP per 15 minutes.
 * Successful requests are not counted, so a legitimate user who logs in on the
 * first try never burns quota.
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    data: null,
  },
});

/**
 * Password-reset and email-verification dispatch. Keyed per IP; 3 per hour is
 * plenty for a real user and stops the SMTP account being used as a relay.
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: {
    success: false,
    message: 'Too many reset requests. Please try again in an hour.',
    data: null,
  },
});

/** Limiter for public write endpoints (contact form, RFQ submission). */
export const publicWriteLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.',
    data: null,
  },
});
```

## `server/src/middleware/upload.ts`

```ts
import type { Request } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { ApiError } from '../utils/ApiError';

/**
 * Multer configured with in-memory storage.
 *
 * Files are held as buffers and piped to Cloudinary by
 * `services/upload.service.ts` — nothing ever touches the server disk, which
 * matters on ephemeral hosts like Railway/Render.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const DOCUMENT_MIME_TYPES: readonly string[] = ['application/pdf'];

/** Build a Multer instance restricted to a MIME allow-list. */
function createUploader(allowed: readonly string[], label: string): multer.Multer {
  const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest(`Only ${label} are allowed (received ${file.mimetype})`));
  };

  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 8 },
  });
}

/** Product and banner imagery. */
export const imageUpload = createUploader(IMAGE_MIME_TYPES, 'JPEG, PNG, WebP and AVIF images');

/** Datasheets and RFQ attachments. */
export const documentUpload = createUploader(DOCUMENT_MIME_TYPES, 'PDF files');

/** Mixed: product galleries that may also carry a datasheet. */
export const mediaUpload = createUploader(
  [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
  'images and PDF files',
);

export const uploadSingleImage = imageUpload.single('image');
export const uploadProductImages = imageUpload.array('images', 8);
export const uploadDatasheets = documentUpload.array('datasheets', 5);
export const uploadAttachments = documentUpload.array('attachments', 5);
```

## `server/src/middleware/validate.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Validate and *replace* request segments with their parsed (coerced, stripped)
 * values, so controllers receive fully typed, trusted input.
 *
 *   router.post('/', validate({ body: createProductSchema }), controller);
 *
 * ZodErrors bubble to the global error handler, which formats them as
 * field-level 422 responses.
 */
export interface ValidationSchemas {
  body?: AnyZodObject | ZodTypeAny;
  query?: AnyZodObject | ZodTypeAny;
  params?: AnyZodObject | ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        const parsed: unknown = schemas.params.parse(req.params);
        req.params = parsed as typeof req.params;
      }
      if (schemas.query) {
        const parsed: unknown = schemas.query.parse(req.query);
        // `req.query` has only a getter in Express 5; assign via defineProperty.
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) {
        const parsed: unknown = schemas.body.parse(req.body);
        req.body = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

## `server/src/middleware/auth.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import type { AuthUser, UserRole } from '../types';

/** Cookie names used for the httpOnly token pair. */
export const ACCESS_TOKEN_COOKIE = 'ft_access_token';
export const REFRESH_TOKEN_COOKIE = 'ft_refresh_token';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sub === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.role === 'admin' || candidate.role === 'manager' || candidate.role === 'customer')
  );
}

/** Read the access token from the httpOnly cookie, falling back to Bearer. */
function extractToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[ACCESS_TOKEN_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

/** Require a valid access token; attaches `req.user`. */
export function protect(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  try {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (!isAccessTokenPayload(decoded)) {
      next(ApiError.unauthorized('Malformed token payload'));
      return;
    }

    const user: AuthUser = { id: decoded.sub, email: decoded.email, role: decoded.role };
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Attach `req.user` when a valid token exists, but never reject. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (isAccessTokenPayload(decoded)) {
      req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    }
  } catch {
    // An invalid token is simply treated as anonymous here.
  }
  next();
}

/** Restrict a route to one or more roles. Must run after `protect`. */
export function restrictTo(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
```

## `server/src/middleware/errorHandler.ts`

```ts
import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import type { ApiErrorDetail, ApiErrorResponse } from '../types/api';

interface NormalisedError {
  statusCode: number;
  message: string;
  errors: ApiErrorDetail[];
  isOperational: boolean;
}

/** Translate known error shapes into a client-safe ApiError-like structure. */
function normalise(error: unknown): NormalisedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      isOperational: error.isOperational,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `Invalid value for "${error.path}"`,
      errors: [{ field: error.path, message: 'Malformed identifier' }],
      isOperational: true,
    };
  }

  // Duplicate key.
  if (error instanceof MongoServerError && error.code === 11000) {
    const field = Object.keys((error.keyValue ?? {}) as Record<string, unknown>)[0] ?? 'field';
    return {
      statusCode: 409,
      message: `A record with that ${field} already exists`,
      errors: [{ field, message: 'Must be unique' }],
      isOperational: true,
    };
  }

  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token', errors: [], isOperational: true };
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Session expired', errors: [], isOperational: true };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : 'Something went wrong',
    errors: [],
    isOperational: false,
  };
}

/**
 * Global error handler. Must be registered last and must keep all four
 * parameters — Express identifies error middleware by arity.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { statusCode, message, errors, isOperational } = normalise(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    ip: req.ip,
  };

  if (statusCode >= 500 || !isOperational) {
    logger.error(`[error] ${message}`, { ...logPayload, stack });
  } else {
    logger.warn(`[error] ${message}`, logPayload);
  }

  // Never leak internals in production: unexpected errors become a generic 500.
  const clientMessage = isProduction && !isOperational ? 'Something went wrong' : message;

  const body: ApiErrorResponse = {
    success: false,
    message: clientMessage,
    data: null,
    ...(errors.length > 0 ? { errors } : {}),
    ...(isProduction ? {} : { stack }),
  };

  res.status(statusCode).json(body);
}
```

## `server/src/middleware/notFound.ts`

```ts
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Catch-all for unmatched routes. Runs after every router so that a 404 is
 * emitted through the same error pipeline as everything else.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
```

## `server/src/middleware/requestId.ts`

```ts
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assign a correlation id to every request so a log line can be traced back to
 * the exact client call. Honours an inbound `X-Request-Id` when present.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const id = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
```

## `server/src/middleware/index.ts`

```ts
export { requestId } from './requestId';
export { notFound } from './notFound';
export { errorHandler } from './errorHandler';
export { sanitizeRequest } from './sanitize';
export { validate, type ValidationSchemas } from './validate';
export {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  publicWriteLimiter,
} from './rateLimit';
export {
  protect,
  optionalAuth,
  restrictTo,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './auth';
export {
  imageUpload,
  documentUpload,
  mediaUpload,
  uploadSingleImage,
  uploadProductImages,
  uploadDatasheets,
  uploadAttachments,
  MAX_FILE_SIZE_BYTES,
} from './upload';
```

## `server/src/utils/ApiError.ts`

```ts
import type { ApiErrorDetail } from '../types/api';

/**
 * Operational (expected) error. Anything thrown as an ApiError is safe to
 * surface to the client; everything else is treated as a bug and masked with a
 * generic 500 by the global error handler.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options: { errors?: ApiErrorDetail[]; isOperational?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = options.errors ?? [];
    this.isOperational = options.isOperational ?? true;
    if (options.cause !== undefined) this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(400, message, errors ? { errors } : {});
  }

  static unauthorized(message = 'You are not authenticated'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Validation failed', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(422, message, errors ? { errors } : {});
  }

  static tooManyRequests(message = 'Too many requests, please slow down'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Something went wrong', cause?: unknown): ApiError {
    return new ApiError(500, message, { isOperational: false, cause });
  }
}
```

## `server/src/utils/ApiResponse.ts`

```ts
import type { Response } from 'express';
import type { ApiResponse, Paginated } from '../types/api';

/**
 * Helpers that guarantee every endpoint emits the same envelope:
 *   { success, message, data }
 *
 * They write to the response rather than returning it — `res.json()` is typed
 * `any`, and returning that would leak an untyped value into controllers.
 */

export function sendSuccess<T>(
  res: Response,
  data: T | null,
  message = 'Success',
  statusCode = 200,
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T | null, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response, message = 'Deleted successfully'): void {
  sendSuccess(res, null, message, 200);
}

/** Build the pagination envelope from a slice of results and a total count. */
export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
```

## `server/src/utils/asyncHandler.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap an async route handler so rejected promises reach the global error
 * handler instead of becoming unhandled rejections.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
```

## `server/src/utils/cookies.ts`

```ts
import type { CookieOptions, Response } from 'express';
import { env, isProduction } from '../config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../middleware/auth';
import type { AuthTokens } from '../types';

/**
 * Cookie helpers for the auth token pair and the guest cart session.
 *
 * The access token is returned in the JSON body *and* mirrored into an
 * httpOnly cookie: browser clients ride on the cookie (no token in JS memory,
 * so XSS cannot exfiltrate it), while native/mobile clients can use the JSON
 * value as a Bearer token.
 */

export const SESSION_ID_COOKIE = 'ft_session_id';

/** Convert `15m` / `7d` / `900` into milliseconds. */
export function durationToMs(duration: string): number {
  const match = /^(\d+)([smhdw])?$/.exec(duration);
  if (!match?.[1]) return 0;

  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const factors: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return value * (factors[unit] ?? 1000);
}

function baseOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    // `lax` keeps the cookie on top-level navigations from email links while
    // still blocking cross-site POSTs. Switch to `none` only if the API and
    // site end up on unrelated domains.
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, baseOptions(durationToMs(env.ACCESS_EXPIRY)));
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    baseOptions(durationToMs(env.REFRESH_EXPIRY)),
  );
}

export function clearAuthCookies(res: Response): void {
  const options: CookieOptions = { ...baseOptions(0), maxAge: undefined };
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

/** 30 days — matches the guest cart TTL on the Cart model. */
export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_ID_COOKIE, sessionId, baseOptions(30 * 86_400_000));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_ID_COOKIE, { ...baseOptions(0), maxAge: undefined });
}
```

## `server/src/utils/slug.ts`

```ts
import type { Model } from 'mongoose';

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a slug that is unique within a collection.
 * Collisions get a numeric suffix: `mccb-250a`, `mccb-250a-2`, `mccb-250a-3`.
 *
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
export async function uniqueSlug<T>(
  model: Model<T>,
  source: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(source) || 'item';

  // One query fetches every sibling slug, so N collisions cost one round trip.
  const taken = await model
    .find({
      slug: new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?$`),
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    .select('slug')
    .lean<{ slug: string }[]>();

  const used = new Set(taken.map((item) => item.slug));
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
```

## `server/src/utils/pagination.ts`

```ts
/**
 * Pagination metadata attached to every list endpoint.
 * Field names match the client contract exactly.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1 && total > 0,
  };
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { items, meta: buildMeta(total, page, limit) };
}

/** Convert a validated page/limit pair into a Mongo skip value. */
export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
```

## `server/src/utils/tokens.ts`

```ts
import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthTokens, UserRole } from '../types/user.types';

/**
 * JWT issuing and one-time token helpers.
 * Lives outside the User model so controllers and the refresh flow can reuse it
 * without loading Mongoose.
 */

export interface TokenSubject {
  id: string;
  email: string;
  role: UserRole;
}

/** Sign a short-lived access token (default 15m). */
export function signAccessToken(subject: TokenSubject): string {
  const options = { expiresIn: env.ACCESS_EXPIRY } as SignOptions;
  return jwt.sign(
    { sub: subject.id, email: subject.email, role: subject.role },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

/** Sign a long-lived refresh token (default 7d). */
export function signRefreshToken(subject: TokenSubject): string {
  const options = { expiresIn: env.REFRESH_EXPIRY } as SignOptions;
  return jwt.sign({ sub: subject.id, tokenType: 'refresh' }, env.JWT_REFRESH_SECRET, options);
}

export function signTokenPair(subject: TokenSubject): AuthTokens {
  return {
    accessToken: signAccessToken(subject),
    refreshToken: signRefreshToken(subject),
  };
}

/**
 * Create a random token for email verification / password reset.
 * The raw value is emailed to the user; only the SHA-256 hash is stored, so a
 * database leak cannot be replayed.
 */
export function createOneTimeToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hashed: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

## `server/src/utils/index.ts`

```ts
export { ApiError } from './ApiError';
export { sendSuccess, sendCreated, sendNoContent, paginate } from './ApiResponse';
export { asyncHandler } from './asyncHandler';
export {
  signAccessToken,
  signRefreshToken,
  signTokenPair,
  createOneTimeToken,
  hashToken,
  type TokenSubject,
} from './tokens';
export {
  setAuthCookies,
  clearAuthCookies,
  setSessionCookie,
  clearSessionCookie,
  durationToMs,
  SESSION_ID_COOKIE,
} from './cookies';
export { slugify, uniqueSlug } from './slug';
export {
  buildMeta,
  paginated,
  toSkip,
  type PaginationMeta,
  type PaginatedResult,
} from './pagination';
```

## `server/src/validators/auth.validators.ts`

```ts
import { z } from 'zod';
import {
  addressSchema,
  emailSchema,
  nameSchema,
  ntnSchema,
  passwordSchema,
  phoneSchema,
} from './common.validators';

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  companyName: z.string().trim().max(160).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema` — an existing account may predate the rules, and
  // echoing complexity requirements on login leaks policy to attackers.
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    companyName: z.string().trim().max(160).nullable().optional(),
    ntn: ntnSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    { message: 'New password must differ from the current one', path: ['newPassword'] },
  );
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({ password: passwordSchema });

export const createAddressSchema = addressSchema;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = addressSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Provide at least one field to update',
);
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
```

## `server/src/validators/cart.validators.ts`

```ts
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
```

## `server/src/validators/catalog.validators.ts`

```ts
import { z } from 'zod';
import { booleanQuerySchema, csvSchema, paginationSchema, slugSchema } from './common.validators';

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'name'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * Spec filter syntax: `specs=Poles:3P|Rated Current:100 A`
 * Pipe separates filters, the first colon separates key from value, so values
 * containing colons still work.
 */
const specsSchema = z.string().transform((value) =>
  value
    .split('|')
    .map((pair) => {
      const index = pair.indexOf(':');
      if (index < 1) return null;
      return { key: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((item): item is { key: string; value: string } => item !== null && item.value !== ''),
);

export const productQuerySchema = paginationSchema.extend({
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  /** Category slug — matches the category itself and everything beneath it. */
  category: slugSchema.optional(),
  /** One or more brand slugs, comma separated. */
  brand: csvSchema.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: booleanQuerySchema.optional(),
  pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
  isFeatured: booleanQuerySchema.optional(),
  tags: csvSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  specs: specsSchema.optional(),
})
  .refine(
    (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const similarQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(8),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least two characters').max(80),
  limit: z.coerce.number().int().positive().max(15).default(8),
});

export const categoryTreeQuerySchema = z.object({
  /** Include categories with no active products. */
  includeEmpty: booleanQuerySchema.default(true),
  featuredOnly: booleanQuerySchema.default(false),
});

export const brandQuerySchema = z.object({
  featuredOnly: booleanQuerySchema.default(false),
  withCounts: booleanQuerySchema.default(false),
});
```

## `server/src/validators/common.validators.ts`

```ts
import { z } from 'zod';
import { PROVINCES } from '../types/user.types';

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
export const ntnSchema = z
  .string()
  .trim()
  .regex(/^\d{7}-?\d$|^\d{13}$/, 'Enter a valid NTN or CNIC');

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default('Home'),
  line1: z.string().trim().min(3, 'Address is too short').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  province: z.enum(PROVINCES),
  postalCode: z.string().trim().max(10).optional(),
  isDefault: z.boolean().default(false),
});

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

export const idParamSchema = z.object({ id: objectIdSchema });
export const slugParamSchema = z.object({ slug: slugSchema });
export const tokenParamSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid or malformed token'),
});
```

## `server/src/validators/index.ts`

```ts
export * from './common.validators';
export * from './auth.validators';
export * from './catalog.validators';
export * from './cart.validators';
export * from './order.validators';
export * from './quotation.validators';
export * from './misc.validators';
```

## `server/src/validators/misc.validators.ts`

```ts
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
```

## `server/src/validators/order.validators.ts`

```ts
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
```

## `server/src/validators/quotation.validators.ts`

```ts
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
```

## `server/src/services/audit.service.ts`

```ts
import type { Request } from 'express';
import { logger } from '../config/logger';
import { AuditLog } from '../models';
import type { AuditAction } from '../types';

/**
 * Append-only audit trail for mutations.
 *
 * Writes are fire-and-forget: an audit failure must never break the operation
 * it is recording, but it must always be visible in the logs.
 */

export interface AuditEntry {
  req: Request;
  action: AuditAction;
  /** Model name, e.g. "Order". */
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/** Strip anything sensitive before a snapshot is persisted. */
const REDACTED_KEYS = new Set([
  'passwordHash',
  'refreshTokens',
  'emailVerifyToken',
  'resetPasswordToken',
  'resetPasswordExpiry',
  'costPrice',
]);

function redact(snapshot?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!snapshot) return undefined;
  return Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => !REDACTED_KEYS.has(key)),
  );
}

export function recordAudit({ req, action, entity, entityId, before, after }: AuditEntry): void {
  const entry = {
    actor: req.user?.id ?? null,
    action,
    entity,
    entityId,
    before: redact(before),
    after: redact(after),
    ip: req.ip,
    at: new Date(),
  };

  void AuditLog.create(entry).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[audit] Failed to record ${action} on ${entity}/${entityId}: ${message}`);
  });
}
```

## `server/src/services/auth.service.ts`

```ts
import { User, type UserDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { createOneTimeToken, hashToken } from '../utils/tokens';
import type { AuthTokens, User as PublicUser } from '../types';

/**
 * Authentication domain logic: credential checks, refresh-token rotation with
 * reuse detection, and one-time token issuing.
 *
 * Refresh tokens are stored as SHA-256 hashes, so a database leak cannot be
 * replayed against the API.
 */

export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Project a user document down to the public API shape. */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    ...(user.companyName ? { companyName: user.companyName } : {}),
    ...(user.ntn ? { ntn: user.ntn } : {}),
    addresses: user.addresses,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    ...(user.lastLogin ? { lastLogin: user.lastLogin.toISOString() } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Verify credentials. Uses one generic message so emails cannot be enumerated. */
export async function authenticate(email: string, password: string): Promise<UserDocument> {
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokens');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact us.');
  }

  return user;
}

/** Issue a token pair and remember the refresh token's hash. */
export async function issueTokens(user: UserDocument): Promise<AuthTokens> {
  const tokens = user.generateTokens();
  user.refreshTokens.push(hashToken(tokens.refreshToken));
  user.lastLogin = new Date();
  await user.save();
  return tokens;
}

/**
 * Rotate a refresh token.
 *
 * A syntactically valid token whose hash is *not* on file means it was already
 * rotated — i.e. stolen and replayed. In that case every session is revoked.
 */
export async function rotateRefreshToken(
  userId: string,
  presentedToken: string,
): Promise<{ user: UserDocument; tokens: AuthTokens }> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Session is no longer valid');

  const presentedHash = hashToken(presentedToken);
  const index = user.refreshTokens.indexOf(presentedHash);

  if (index === -1) {
    user.refreshTokens = [];
    await user.save();
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }

  user.refreshTokens.splice(index, 1);
  const tokens = user.generateTokens();
  user.refreshTokens.push(hashToken(tokens.refreshToken));
  await user.save();

  return { user, tokens };
}

/** Drop one refresh token (single-device logout). */
export async function revokeRefreshToken(userId: string, presentedToken: string): Promise<void> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  const hashed = hashToken(presentedToken);
  user.refreshTokens = user.refreshTokens.filter((token) => token !== hashed);
  await user.save();
}

/** Drop every refresh token (used after a password change). */
export async function revokeAllSessions(user: UserDocument): Promise<void> {
  user.refreshTokens = [];
  await user.save();
}

/** Create and persist an email-verification token; returns the raw value. */
export async function createEmailVerifyToken(user: UserDocument): Promise<string> {
  const { raw, hashed } = createOneTimeToken();
  user.emailVerifyToken = hashed;
  user.emailVerifyExpiry = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
  await user.save();
  return raw;
}

/** Create and persist a password-reset token; returns the raw value. */
export async function createPasswordResetToken(user: UserDocument): Promise<string> {
  const { raw, hashed } = createOneTimeToken();
  user.resetPasswordToken = hashed;
  user.resetPasswordExpiry = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();
  return raw;
}

/** Look up an unexpired reset token by its raw value. */
export async function findByResetToken(rawToken: string): Promise<UserDocument | null> {
  const user = await User.findOne({ resetPasswordToken: hashToken(rawToken) }).select(
    '+passwordHash +refreshTokens +resetPasswordToken +resetPasswordExpiry',
  );

  // Expiry is checked here rather than in the query: the token is 32 random
  // bytes, so the lookup is already unguessable, and this keeps the filter
  // free of operators (and the Mongoose typings honest).
  if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry.getTime() < Date.now()) {
    return null;
  }
  return user;
}

/** Look up an unexpired email-verification token by its raw value. */
export async function findByVerifyToken(rawToken: string): Promise<UserDocument | null> {
  const user = await User.findOne({ emailVerifyToken: hashToken(rawToken) }).select(
    '+emailVerifyToken +emailVerifyExpiry',
  );

  if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry.getTime() < Date.now()) {
    return null;
  }
  return user;
}
```

## `server/src/services/cart.service.ts`

```ts
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Cart, Product, type CartDocument, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import type { CartType, PricingMode } from '../types';

/**
 * Cart domain logic, shared by both carts.
 *
 * The `type` discriminator decides which products are admissible:
 *   shopping -> pricingMode retail | both
 *   inquiry  -> pricingMode quote  | both
 */

export interface CartOwner {
  user: string | null;
  sessionId: string | null;
}

const ADMISSIBLE: Record<CartType, PricingMode[]> = {
  shopping: ['retail', 'both'],
  inquiry: ['quote', 'both'],
};

function ownerFilter(owner: CartOwner, type: CartType): Record<string, unknown> {
  if (owner.user) return { user: new Types.ObjectId(owner.user), type };
  if (owner.sessionId) return { sessionId: owner.sessionId, type };
  throw ApiError.badRequest('No cart owner could be determined');
}

/** Fetch the caller's cart, creating an empty one on first use. */
export async function getOrCreateCart(owner: CartOwner, type: CartType): Promise<CartDocument> {
  const filter = ownerFilter(owner, type);
  const existing = await Cart.findOne(filter);
  if (existing) return existing;

  const cart = new Cart({
    type,
    user: owner.user ? new Types.ObjectId(owner.user) : null,
    sessionId: owner.user ? null : owner.sessionId,
  });
  await cart.save();
  return cart;
}

/** Load a product and check it may enter this cart. */
async function loadAdmissibleProduct(
  productId: string,
  type: CartType,
): Promise<IProduct & { _id: Types.ObjectId }> {
  const product = await Product.findById(productId).lean<IProduct & { _id: Types.ObjectId }>();

  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  const allowed = ADMISSIBLE[type];
  if (!allowed.includes(product.pricingMode)) {
    throw ApiError.badRequest(
      type === 'shopping'
        ? 'This product is quote-only. Add it to your inquiry list instead.'
        : 'This product is sold at a fixed price. Add it to your cart instead.',
    );
  }

  return product;
}

export interface AddItemInput {
  product: string;
  qty: number;
  variant?: string;
  note?: string;
}

export async function addItem(
  owner: CartOwner,
  type: CartType,
  input: AddItemInput,
): Promise<CartDocument> {
  const product = await loadAdmissibleProduct(input.product, type);
  const cart = await getOrCreateCart(owner, type);

  if (input.qty < product.minOrderQty) {
    throw ApiError.badRequest(
      `Minimum order quantity for this item is ${product.minOrderQty} ${product.unit}`,
    );
  }

  // Only the shopping cart enforces stock; an RFQ may exceed what is on hand.
  if (type === 'shopping' && product.stock < input.qty) {
    throw ApiError.badRequest(
      product.stock > 0 ? `Only ${product.stock} in stock` : 'This item is out of stock',
    );
  }

  const existing = cart.items.find(
    (item) => item.product.toString() === input.product && item.variant === input.variant,
  );

  if (existing) {
    existing.qty += input.qty;
    if (input.note !== undefined) existing.note = input.note;
  } else {
    cart.items.push({
      product: product._id,
      qty: input.qty,
      ...(input.variant ? { variant: input.variant } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(type === 'shopping' && typeof product.price === 'number'
        ? { priceAtAdd: product.price }
        : {}),
      addedAt: new Date(),
    });
  }

  await cart.save();
  return cart;
}

export async function updateItem(
  owner: CartOwner,
  type: CartType,
  productId: string,
  patch: { qty?: number; note?: string; variant?: string },
): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);

  const item = cart.items.find(
    (entry) => entry.product.toString() === productId && entry.variant === patch.variant,
  );
  if (!item) throw ApiError.notFound('That item is not in your cart');

  if (patch.qty !== undefined) {
    const product = await loadAdmissibleProduct(productId, type);
    if (patch.qty < product.minOrderQty) {
      throw ApiError.badRequest(`Minimum order quantity is ${product.minOrderQty}`);
    }
    if (type === 'shopping' && product.stock < patch.qty) {
      throw ApiError.badRequest(`Only ${product.stock} in stock`);
    }
    item.qty = patch.qty;
  }

  if (patch.note !== undefined) item.note = patch.note;

  await cart.save();
  return cart;
}

export async function removeItem(
  owner: CartOwner,
  type: CartType,
  productId: string,
  variant?: string,
): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);
  const before = cart.items.length;

  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === productId && item.variant === variant),
  );

  if (cart.items.length === before) throw ApiError.notFound('That item is not in your cart');

  await cart.save();
  return cart;
}

export async function clearCart(owner: CartOwner, type: CartType): Promise<CartDocument> {
  const cart = await getOrCreateCart(owner, type);
  cart.items = [];
  await cart.save();
  return cart;
}

/**
 * Fold a guest's carts into their account at login/registration.
 * Quantities are summed for products present in both; the guest cart is then
 * deleted so the session cookie can be retired.
 */
export async function mergeGuestCarts(sessionId: string | null, userId: string): Promise<void> {
  if (!sessionId) return;

  try {
    const guestCarts = await Cart.find({ sessionId });

    for (const guestCart of guestCarts) {
      if (guestCart.items.length === 0) {
        await guestCart.deleteOne();
        continue;
      }

      const userCart = await getOrCreateCart({ user: userId, sessionId: null }, guestCart.type);

      for (const guestItem of guestCart.items) {
        const match = userCart.items.find(
          (item) =>
            item.product.toString() === guestItem.product.toString() &&
            item.variant === guestItem.variant,
        );
        if (match) match.qty += guestItem.qty;
        else userCart.items.push(guestItem);
      }

      await userCart.save();
      await guestCart.deleteOne();
    }
  } catch (error) {
    // A merge failure must never block sign-in.
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[cart] Guest cart merge failed for session ${sessionId}: ${message}`);
  }
}
```

## `server/src/services/cart.view.ts`

```ts
import type { Types } from 'mongoose';
import { Product, Setting, type CartDocument, type IProduct } from '../models';
import type { CartType, ProductUnit } from '../types';

/**
 * Cart hydration and pricing.
 *
 * Line prices always come from the *current* product record, never from the
 * client. `priceChanged` tells the UI when the snapshot taken at add-to-cart
 * time no longer matches, so the customer is never surprised at checkout.
 */

export interface HydratedCartLine {
  product: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
  unit: ProductUnit;
  qty: number;
  minOrderQty: number;
  variant?: string;
  note?: string;
  /** Absent on inquiry lines and on quote-only products. */
  price?: number;
  priceAtAdd?: number;
  priceChanged: boolean;
  subtotal?: number;
  stock: number;
  inStock: boolean;
  isAvailable: boolean;
}

export interface CartSummary {
  type: CartType;
  items: HydratedCartLine[];
  itemCount: number;
  lineCount: number;
  /** Shopping cart only. */
  subtotal: number;
  taxAmount: number;
  estimatedTotal: number;
  /** Lines whose product went inactive or out of stock since being added. */
  hasIssues: boolean;
}

type LeanProduct = IProduct & { _id: Types.ObjectId };

async function defaultTaxRate(): Promise<number> {
  const setting = await Setting.findOne({ key: 'global' }).select('defaultTaxRate').lean<{
    defaultTaxRate: number;
  }>();
  return setting?.defaultTaxRate ?? 18;
}

export async function hydrateCart(cart: CartDocument): Promise<CartSummary> {
  const ids = cart.items.map((item) => item.product);

  // `costPrice` is `select: false`, so it cannot leak through this projection.
  const products = await Product.find({ _id: { $in: ids } }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const isShopping = cart.type === 'shopping';
  const lines: HydratedCartLine[] = [];

  for (const item of cart.items) {
    const product = byId.get(item.product.toString());
    if (!product) continue; // product deleted — drop the orphan line from the view

    const price = isShopping ? product.price : undefined;
    const priceChanged =
      isShopping &&
      typeof item.priceAtAdd === 'number' &&
      typeof price === 'number' &&
      item.priceAtAdd !== price;

    lines.push({
      product: product._id.toString(),
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
      unit: product.unit,
      qty: item.qty,
      minOrderQty: product.minOrderQty,
      ...(item.variant ? { variant: item.variant } : {}),
      ...(item.note ? { note: item.note } : {}),
      ...(typeof price === 'number' ? { price, subtotal: round(price * item.qty) } : {}),
      ...(typeof item.priceAtAdd === 'number' ? { priceAtAdd: item.priceAtAdd } : {}),
      priceChanged,
      stock: product.stock,
      inStock: product.stock >= item.qty,
      isAvailable: product.isActive && (!isShopping || product.stock >= item.qty),
    });
  }

  const subtotal = round(lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0));
  const taxRate = isShopping && subtotal > 0 ? await defaultTaxRate() : 0;
  const taxAmount = round((subtotal * taxRate) / 100);

  return {
    type: cart.type,
    items: lines,
    itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
    lineCount: lines.length,
    subtotal,
    taxAmount,
    // Delivery is added at checkout once a city is known.
    estimatedTotal: round(subtotal + taxAmount),
    hasIssues: lines.some((line) => !line.isAvailable || line.priceChanged),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
```

## `server/src/services/catalog.facets.ts`

```ts
import type { PipelineStage, Types } from 'mongoose';
import { Brand, Category, Product } from '../models';
import { buildProductFilter, type ResolvedRefs } from './catalog.filter';
import type { ProductQuery } from '../validators';

/**
 * Facet counts for the filter sidebar.
 *
 * Each facet is computed with its *own* dimension removed from the filter —
 * otherwise selecting "Schneider" would collapse the brand list to a single
 * entry and the shopper could never widen the selection again.
 */

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  pricingModes: FacetBucket[];
  stockStatus: FacetBucket[];
  specs: { key: string; values: FacetBucket[] }[];
  priceRange: { min: number; max: number } | null;
}

const MAX_SPEC_KEYS = 8;
const MAX_SPEC_VALUES = 12;

interface IdCount {
  _id: Types.ObjectId | string | null;
  count: number;
}

interface SpecRow {
  _id: { key: string; value: string };
  count: number;
}

export async function buildFacets(
  query: ProductQuery,
  refs: ResolvedRefs,
): Promise<ProductFacets> {
  // Shared prefix: everything except the four facetable dimensions.
  const base = buildProductFilter(query, refs, ['category', 'brand', 'price', 'stock']);

  const withoutBrand = buildProductFilter(query, refs, ['brand']);
  const withoutCategory = buildProductFilter(query, refs, ['category']);
  const withoutPrice = buildProductFilter(query, refs, ['price']);
  const withoutStock = buildProductFilter(query, refs, ['stock']);

  const pipeline: PipelineStage[] = [
    { $match: base },
    {
      $facet: {
        brands: [{ $match: withoutBrand }, { $group: { _id: '$brand', count: { $sum: 1 } } }],
        categories: [
          { $match: withoutCategory },
          { $group: { _id: '$subCategory', count: { $sum: 1 } } },
        ],
        pricingModes: [
          { $match: withoutBrand },
          { $group: { _id: '$pricingMode', count: { $sum: 1 } } },
        ],
        stockStatus: [{ $match: withoutStock }, { $group: { _id: '$stockStatus', count: { $sum: 1 } } }],
        priceRange: [
          { $match: { ...withoutPrice, price: { $exists: true, $gt: 0 } } },
          { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
        ],
        specs: [
          { $match: withoutBrand },
          { $unwind: '$specifications' },
          {
            $group: {
              _id: { key: '$specifications.key', value: '$specifications.value' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: MAX_SPEC_KEYS * MAX_SPEC_VALUES },
        ],
      },
    },
  ];

  const [raw] = await Product.aggregate<{
    brands: IdCount[];
    categories: IdCount[];
    pricingModes: IdCount[];
    stockStatus: IdCount[];
    priceRange: { min: number; max: number }[];
    specs: SpecRow[];
  }>(pipeline);

  if (!raw) {
    return { categories: [], brands: [], pricingModes: [], stockStatus: [], specs: [], priceRange: null };
  }

  const [brandLabels, categoryLabels] = await Promise.all([
    labelMap('brand', raw.brands),
    labelMap('category', raw.categories),
  ]);

  return {
    brands: toBuckets(raw.brands, brandLabels),
    categories: toBuckets(raw.categories, categoryLabels),
    pricingModes: raw.pricingModes
      .filter((row): row is IdCount & { _id: string } => typeof row._id === 'string')
      .map((row) => ({ value: row._id, label: PRICING_LABELS[row._id] ?? row._id, count: row.count })),
    stockStatus: raw.stockStatus
      .filter((row): row is IdCount & { _id: string } => typeof row._id === 'string')
      .map((row) => ({ value: row._id, label: STOCK_LABELS[row._id] ?? row._id, count: row.count })),
    specs: groupSpecs(raw.specs),
    priceRange: raw.priceRange[0] ?? null,
  };
}

const PRICING_LABELS: Record<string, string> = {
  retail: 'Buy online',
  quote: 'Request a quote',
  both: 'Buy or request a quote',
};

const STOCK_LABELS: Record<string, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  on_order: 'On order',
};

interface LabelRow {
  _id: Types.ObjectId;
  slug: string;
  name: string;
}

/** Resolve ObjectId buckets to `{ slug, name }` for display. */
async function labelMap(
  kind: 'brand' | 'category',
  rows: IdCount[],
): Promise<Map<string, { slug: string; name: string }>> {
  const ids = rows
    .map((row) => row._id)
    .filter((id): id is Types.ObjectId => id !== null && typeof id !== 'string');

  if (ids.length === 0) return new Map();

  const filter = { _id: { $in: ids } };
  const docs =
    kind === 'brand'
      ? await Brand.find(filter).select('slug name').lean<LabelRow[]>()
      : await Category.find(filter).select('slug name').lean<LabelRow[]>();

  return new Map(docs.map((doc) => [doc._id.toString(), { slug: doc.slug, name: doc.name }]));
}

function toBuckets(rows: IdCount[], labels: Map<string, { slug: string; name: string }>): FacetBucket[] {
  return rows
    .map((row) => {
      if (row._id === null || typeof row._id === 'string') return null;
      const label = labels.get(row._id.toString());
      if (!label) return null;
      return { value: label.slug, label: label.name, count: row.count };
    })
    .filter((bucket): bucket is FacetBucket => bucket !== null)
    .sort((a, b) => b.count - a.count);
}

function groupSpecs(rows: SpecRow[]): { key: string; values: FacetBucket[] }[] {
  const grouped = new Map<string, FacetBucket[]>();

  for (const row of rows) {
    const bucket = grouped.get(row._id.key) ?? [];
    if (bucket.length < MAX_SPEC_VALUES) {
      bucket.push({ value: row._id.value, label: row._id.value, count: row.count });
    }
    grouped.set(row._id.key, bucket);
  }

  return [...grouped.entries()]
    .map(([key, values]) => ({ key, values }))
    .sort((a, b) => b.values.length - a.values.length)
    .slice(0, MAX_SPEC_KEYS);
}
```

## `server/src/services/catalog.filter.ts`

```ts
import type { FilterQuery, Types } from 'mongoose';
import { Brand, Category, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import type { ProductQuery } from '../validators';

/**
 * Translates the public product query string into a Mongo filter.
 *
 * `omit` lets the facet builder drop one dimension so that, for example, the
 * brand facet still shows every brand available under the current category
 * rather than only the brand already selected.
 */

export type FilterDimension = 'category' | 'brand' | 'price' | 'stock';

export interface ResolvedRefs {
  /** The category plus every descendant, so a parent shows the whole subtree. */
  categoryIds: Types.ObjectId[];
  brandIds: Types.ObjectId[];
}

/** Resolve a category slug to itself + all descendants. */
export async function resolveCategoryIds(slug?: string): Promise<Types.ObjectId[]> {
  if (!slug) return [];

  const category = await Category.findOne({ slug, isActive: true }).select('_id').lean<{
    _id: Types.ObjectId;
  }>();
  if (!category) throw ApiError.notFound(`Category "${slug}" not found`);

  const descendants = await Category.find({ ancestors: category._id, isActive: true })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  return [category._id, ...descendants.map((item) => item._id)];
}

export async function resolveBrandIds(slugs?: string[]): Promise<Types.ObjectId[]> {
  if (!slugs || slugs.length === 0) return [];

  const brands = await Brand.find({ slug: { $in: slugs }, isActive: true })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  if (brands.length === 0) throw ApiError.notFound('No matching brand was found');
  return brands.map((brand) => brand._id);
}

export async function resolveRefs(query: ProductQuery): Promise<ResolvedRefs> {
  const [categoryIds, brandIds] = await Promise.all([
    resolveCategoryIds(query.category),
    resolveBrandIds(query.brand),
  ]);
  return { categoryIds, brandIds };
}

export function buildProductFilter(
  query: ProductQuery,
  refs: ResolvedRefs,
  omit: FilterDimension[] = [],
): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = { isActive: true };
  const skip = new Set(omit);

  if (!skip.has('category') && refs.categoryIds.length > 0) {
    // A product matches if the slug hits either its category or its subCategory.
    filter.$or = [
      { category: { $in: refs.categoryIds } },
      { subCategory: { $in: refs.categoryIds } },
    ];
  }

  if (!skip.has('brand') && refs.brandIds.length > 0) {
    filter.brand = { $in: refs.brandIds };
  }

  if (!skip.has('price') && (query.minPrice !== undefined || query.maxPrice !== undefined)) {
    const price: Record<string, number> = {};
    if (query.minPrice !== undefined) price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) price.$lte = query.maxPrice;
    filter.price = price;
  }

  if (!skip.has('stock') && query.inStock !== undefined) {
    filter.stock = query.inStock ? { $gt: 0 } : { $lte: 0 };
  }

  if (query.pricingMode) filter.pricingMode = query.pricingMode;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  if (query.tags && query.tags.length > 0) filter.tags = { $all: query.tags };

  if (query.search) filter.$text = { $search: query.search };

  // Every spec filter must match a different element of `specifications`.
  if (query.specs && query.specs.length > 0) {
    filter.$and = query.specs.map((spec) => ({
      specifications: { $elemMatch: { key: spec.key, value: spec.value } },
    }));
  }

  return filter;
}

/** Sort stage for each public sort option. */
export type SortSpec = Record<string, 1 | -1 | { $meta: 'textScore' }>;

export function buildSort(sort: ProductQuery['sort'], hasSearch: boolean): SortSpec {
  if (hasSearch && sort === 'newest') {
    // Relevance first when the user actually typed something.
    return { score: { $meta: 'textScore' as const }, createdAt: -1 };
  }

  switch (sort) {
    case 'price_asc':
      return { price: 1, _id: 1 };
    case 'price_desc':
      return { price: -1, _id: 1 };
    case 'popular':
      return { salesCount: -1, viewCount: -1, _id: 1 };
    case 'name':
      return { name: 1, _id: 1 };
    case 'newest':
    default:
      return { createdAt: -1, _id: 1 };
  }
}

/** Fields returned in list responses. `costPrice` is never among them. */
export const LIST_PROJECTION =
  'name slug sku partNumber shortDescription category subCategory brand pricingMode ' +
  'price comparePrice currency stock stockStatus unit minOrderQty images tags ' +
  'isFeatured isNewArrival isBestSeller ratingAvg reviewCount createdAt';
```

## `server/src/services/catalog.service.ts`

```ts
import type { FilterQuery, Types } from 'mongoose';
import { Product, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import { buildMeta, toSkip, type PaginationMeta } from '../utils/pagination';
import { buildFacets, type ProductFacets } from './catalog.facets';
import { LIST_PROJECTION, buildProductFilter, buildSort, resolveRefs } from './catalog.filter';
import type { ProductQuery } from '../validators';

/** Product read operations for the public catalogue. */

type LeanProduct = IProduct & { _id: Types.ObjectId };

const POPULATE_REFS = [
  { path: 'category', select: 'name slug' },
  { path: 'subCategory', select: 'name slug' },
  { path: 'brand', select: 'name slug logo' },
];

export interface ProductListResult {
  items: LeanProduct[];
  meta: PaginationMeta;
  facets: ProductFacets;
}

export async function listProducts(query: ProductQuery): Promise<ProductListResult> {
  const refs = await resolveRefs(query);
  const filter = buildProductFilter(query, refs);
  const sort = buildSort(query.sort, Boolean(query.search));

  const [items, total, facets] = await Promise.all([
    // Mongo adds the textScore projection implicitly when sorting by $meta.
    Product.find(filter)
      .select(LIST_PROJECTION)
      .populate(POPULATE_REFS)
      .sort(sort)
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean<LeanProduct[]>(),
    Product.countDocuments(filter),
    buildFacets(query, refs),
  ]);

  return { items, meta: buildMeta(total, query.page, query.limit), facets };
}

/**
 * Full product detail plus siblings from the same category.
 * `viewCount` is bumped without awaiting so the read stays fast.
 */
export async function getProductBySlug(
  slug: string,
): Promise<{ product: LeanProduct; related: LeanProduct[] }> {
  const product = await Product.findOne({ slug, isActive: true })
    .populate(POPULATE_REFS)
    .lean<LeanProduct>();

  if (!product) throw ApiError.notFound('Product not found');

  void Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => undefined);

  const related = await findRelated(product, 8);
  return { product, related };
}

/** Same subcategory first, then same category, then same brand. */
async function findRelated(product: LeanProduct, limit: number): Promise<LeanProduct[]> {
  const base = { _id: { $ne: product._id }, isActive: true };

  const tiers: FilterQuery<IProduct>[] = [
    ...(product.subCategory ? [{ ...base, subCategory: product.subCategory }] : []),
    { ...base, category: product.category },
    { ...base, brand: product.brand },
  ];

  const found = new Map<string, LeanProduct>();

  for (const tier of tiers) {
    if (found.size >= limit) break;

    const batch = await Product.find(tier)
      .select(LIST_PROJECTION)
      .populate(POPULATE_REFS)
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean<LeanProduct[]>();

    for (const item of batch) {
      if (found.size >= limit) break;
      found.set(item._id.toString(), item);
    }
  }

  return [...found.values()];
}

export async function getSimilarProducts(id: string, limit: number): Promise<LeanProduct[]> {
  const product = await Product.findById(id)
    .select('category subCategory brand tags')
    .lean<LeanProduct>();

  if (!product) throw ApiError.notFound('Product not found');
  return findRelated(product, limit);
}

export interface Suggestion {
  id: string;
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  image?: string;
  price?: number;
  pricingMode: string;
}

/**
 * Autocomplete. Prefix-matches SKU and part number first (a trade buyer
 * pasting "LC1D18" expects an exact hit), then falls back to name.
 */
export async function suggest(term: string, limit: number): Promise<Suggestion[]> {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = new RegExp(`^${escaped}`, 'i');
  const contains = new RegExp(escaped, 'i');

  const products = await Product.find({
    isActive: true,
    $or: [{ sku: prefix }, { partNumber: prefix }, { name: contains }],
  })
    .select('name slug sku partNumber images price pricingMode salesCount')
    .sort({ salesCount: -1, name: 1 })
    .limit(limit)
    .lean<LeanProduct[]>();

  return products.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    ...(product.partNumber ? { partNumber: product.partNumber } : {}),
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
    ...(typeof product.price === 'number' ? { price: product.price } : {}),
    pricingMode: product.pricingMode,
  }));
}
```

## `server/src/services/order.service.ts`

```ts
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Coupon, Order, Product, type IOrderItem, type IProduct, type OrderDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { priceOrder } from './pricing.service';
import type { CreateOrderInput } from '../validators';
import type { ICartItem } from '../models/Cart';

/** Order creation: stock reservation, server-side pricing, persistence. */

type LeanProduct = IProduct & { _id: Types.ObjectId };

export interface BuiltOrderLines {
  items: IOrderItem[];
  subtotal: number;
}

/** Turn cart lines into order lines, pricing each from the live product record. */
export async function buildOrderLines(cartItems: ICartItem[]): Promise<BuiltOrderLines> {
  if (cartItems.length === 0) throw ApiError.badRequest('Your cart is empty');

  const ids = cartItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: ids } }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items: IOrderItem[] = [];

  for (const cartItem of cartItems) {
    const product = byId.get(cartItem.product.toString());

    if (!product || !product.isActive) {
      throw ApiError.badRequest('An item in your cart is no longer available. Please review it.');
    }
    if (product.pricingMode === 'quote' || typeof product.price !== 'number') {
      throw ApiError.badRequest(`"${product.name}" is quote-only and cannot be bought online`);
    }
    if (product.stock < cartItem.qty) {
      throw ApiError.badRequest(
        product.stock > 0
          ? `Only ${product.stock} × "${product.name}" remain in stock`
          : `"${product.name}" is out of stock`,
      );
    }
    if (cartItem.qty < product.minOrderQty) {
      throw ApiError.badRequest(
        `"${product.name}" has a minimum order quantity of ${product.minOrderQty}`,
      );
    }

    items.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
      price: product.price,
      qty: cartItem.qty,
      unit: product.unit,
      ...(cartItem.variant ? { variant: cartItem.variant } : {}),
      subtotal: Math.round(product.price * cartItem.qty * 100) / 100,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

/**
 * Atomically reserve stock.
 *
 * Each decrement is conditional on sufficient stock, so two shoppers racing for
 * the last unit cannot both win. Anything already taken is released if a later
 * line fails.
 */
async function reserveStock(items: IOrderItem[]): Promise<void> {
  const reserved: IOrderItem[] = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty, salesCount: item.qty } },
      { new: true },
    );

    if (!updated) {
      await releaseStock(reserved);
      throw ApiError.conflict(`"${item.name}" sold out while you were checking out`);
    }
    reserved.push(item);
  }
}

/** Give stock back — used on rollback and on cancellation. */
export async function releaseStock(items: IOrderItem[]): Promise<void> {
  await Promise.all(
    items.map((item) =>
      Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.qty, salesCount: -item.qty } },
      ).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[order] Failed to release stock for ${item.sku}: ${message}`);
      }),
    ),
  );
}

export interface CreateOrderContext {
  userId: string | null;
  cartItems: ICartItem[];
  input: CreateOrderInput;
}

export async function createOrder({
  userId,
  cartItems,
  input,
}: CreateOrderContext): Promise<OrderDocument> {
  const { items, subtotal } = await buildOrderLines(cartItems);

  const pricing = await priceOrder({
    subtotal,
    city: input.shippingAddress.city,
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
  });

  await reserveStock(items);

  try {
    const order = await Order.create({
      user: userId ? new Types.ObjectId(userId) : null,
      items,
      customer: input.customer,
      shippingAddress: input.shippingAddress,
      billingAddress: input.sameAsBilling
        ? input.shippingAddress
        : (input.billingAddress ?? input.shippingAddress),
      sameAsBilling: input.sameAsBilling,
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      shippingCost: pricing.shippingCost,
      discount: pricing.discount,
      ...(pricing.couponCode ? { couponCode: pricing.couponCode } : {}),
      total: pricing.total,
      paymentMethod: input.paymentMethod,
      // COD is confirmed immediately; every other rail waits on the gateway.
      paymentStatus: 'pending',
      orderStatus: input.paymentMethod === 'cod' ? 'confirmed' : 'pending',
      ...(input.notes ? { notes: input.notes } : {}),
    });

    if (pricing.couponCode) {
      await Coupon.updateOne({ code: pricing.couponCode }, { $inc: { usedCount: 1 } });
    }

    return order;
  } catch (error) {
    // Persistence failed after stock was taken — put it back.
    await releaseStock(items);
    throw error;
  }
}

/** Cancellation is only allowed before the order has been dispatched. */
export const CANCELLABLE_STATUSES = ['pending', 'confirmed'] as const;

export async function cancelOrder(order: OrderDocument, reason?: string): Promise<OrderDocument> {
  if (!CANCELLABLE_STATUSES.includes(order.orderStatus as (typeof CANCELLABLE_STATUSES)[number])) {
    throw ApiError.badRequest(
      `An order that is already ${order.orderStatus} cannot be cancelled. Please call us on +92 324 4234990.`,
    );
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({
    status: 'cancelled',
    ...(reason ? { note: reason } : {}),
    at: new Date(),
  });
  await order.save();

  await releaseStock(order.items);
  return order;
}
```

## `server/src/services/pricing.service.ts`

```ts
import { Coupon, Setting, type ICoupon, type ISetting } from '../models';
import { ApiError } from '../utils/ApiError';

/**
 * Order pricing: tax, delivery and coupons.
 * Every figure is derived server-side from the database — the client's numbers
 * are treated as display-only.
 */

export interface PricingInput {
  subtotal: number;
  city: string;
  couponCode?: string;
}

export interface PricingResult {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  etaDays: string;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve delivery cost from the settings rules.
 * Rules are matched most-specific first: exact city, then `*` fallback.
 */
export function resolveShipping(
  settings: Pick<ISetting, 'shippingRules'> | null,
  city: string,
  subtotal: number,
): { cost: number; etaDays: string } {
  const rules = settings?.shippingRules ?? [];
  const normalised = city.trim().toLowerCase();

  const rule =
    rules.find((item) => item.city.toLowerCase() === normalised) ??
    rules.find((item) => item.city === '*');

  if (!rule) return { cost: 0, etaDays: 'To be confirmed' };

  const free = typeof rule.freeAbove === 'number' && subtotal >= rule.freeAbove;
  return { cost: free ? 0 : rule.cost, etaDays: rule.etaDays };
}

/** Validate a coupon and compute the rupee discount it yields. */
export function applyCoupon(coupon: ICoupon, subtotal: number): number {
  const now = Date.now();

  if (!coupon.isActive) throw ApiError.badRequest('This coupon is no longer active');
  if (coupon.validFrom.getTime() > now) throw ApiError.badRequest('This coupon is not active yet');
  if (coupon.validTo.getTime() < now) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrder) {
    throw ApiError.badRequest(
      `This coupon needs a minimum order of Rs. ${coupon.minOrder.toLocaleString('en-PK')}`,
    );
  }

  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped =
    coupon.type === 'percent' && typeof coupon.maxDiscount === 'number'
      ? Math.min(raw, coupon.maxDiscount)
      : raw;

  // Never discount below zero.
  return round(Math.min(capped, subtotal));
}

export async function priceOrder({ subtotal, city, couponCode }: PricingInput): Promise<PricingResult> {
  const settings = await Setting.findOne({ key: 'global' })
    .select('shippingRules defaultTaxRate')
    .lean<Pick<ISetting, 'shippingRules' | 'defaultTaxRate'>>();

  const { cost: shippingCost, etaDays } = resolveShipping(settings, city, subtotal);

  let discount = 0;
  let appliedCode: string | undefined;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) throw ApiError.badRequest('That coupon code was not recognised');
    discount = applyCoupon(coupon, subtotal);
    appliedCode = coupon.code;
  }

  const taxRate = settings?.defaultTaxRate ?? 18;
  const taxAmount = round(((subtotal - discount) * taxRate) / 100);
  const total = round(Math.max(0, subtotal - discount + taxAmount + shippingCost));

  return {
    subtotal: round(subtotal),
    taxAmount,
    shippingCost,
    discount,
    ...(appliedCode ? { couponCode: appliedCode } : {}),
    total,
    etaDays,
  };
}
```

## `server/src/services/session.service.ts`

```ts
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { SESSION_ID_COOKIE, setSessionCookie } from '../utils/cookies';

/**
 * Guest identity for the two carts.
 *
 * Anonymous shoppers are tracked with an opaque httpOnly `ft_session_id`
 * cookie. It carries no personal data and is discarded the moment the cart is
 * merged into a logged-in account.
 */

/** Read the session id, minting (and setting) one if the visitor has none. */
export function ensureSessionId(req: Request, res: Response): string {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const existing = cookies?.[SESSION_ID_COOKIE];

  if (existing && /^[\w-]{8,64}$/.test(existing)) {
    req.sessionId = existing;
    return existing;
  }

  const fresh = randomUUID();
  req.sessionId = fresh;
  setSessionCookie(res, fresh);
  return fresh;
}

/** Read the session id without creating one. */
export function readSessionId(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const existing = cookies?.[SESSION_ID_COOKIE];
  return existing && /^[\w-]{8,64}$/.test(existing) ? existing : null;
}

/** Owner filter for a cart query: the user when signed in, else the session. */
export function cartOwner(req: Request, sessionId: string | null): {
  user: string | null;
  sessionId: string | null;
} {
  if (req.user) return { user: req.user.id, sessionId: null };
  return { user: null, sessionId };
}
```

## `server/src/services/upload.service.ts`

```ts
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { CLOUDINARY_FOLDER, cloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

/**
 * Cloudinary upload helpers. Multer keeps files in memory; these functions
 * stream the buffers straight to Cloudinary.
 */

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const DEFAULT_OPTIONS: UploadApiOptions = {
  resource_type: 'image',
  // Cap stored dimensions; next/image handles responsive resizing downstream.
  transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
};

function toUploadedImage(result: UploadApiResponse): UploadedImage {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/** Upload a single in-memory file buffer to a Cloudinary subfolder. */
export function uploadBuffer(buffer: Buffer, subfolder = 'products'): Promise<UploadedImage> {
  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...DEFAULT_OPTIONS, folder: `${CLOUDINARY_FOLDER}/${subfolder}` },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(error?.message ?? 'Image upload failed', error));
          return;
        }
        resolve(toUploadedImage(result));
      },
    );
    stream.end(buffer);
  });
}

/** Upload many files in parallel. */
export function uploadBuffers(
  files: Express.Multer.File[],
  subfolder = 'products',
): Promise<UploadedImage[]> {
  return Promise.all(files.map((file) => uploadBuffer(file.buffer, subfolder)));
}

/** Remove an asset by its Cloudinary public id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
```

## `server/src/services/email/constants.ts`

```ts
import { env } from '../../config/env';

/** Business details used in email footers and links. */
export const CONTACT = {
  address: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
} as const;

export const SITE = {
  name: 'Fast Traders',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  /** First whitelisted origin is the canonical public site. */
  url: env.CLIENT_URL[0] ?? 'https://www.fasttraders.co',
  domain: 'www.fasttraders.co',
} as const;

/** Format a PKR amount for email bodies. */
export function formatPKR(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
}
```

## `server/src/services/email/index.ts`

```ts
import { env } from '../../config/env';
import { dispatchEmail } from './mailer';
import {
  passwordChangedEmail,
  resetPasswordEmail,
  verifyEmail,
  welcomeEmail,
} from './templates.auth';
import {
  contactAlertEmail,
  newOrderAlertEmail,
  newQuotationAlertEmail,
  orderConfirmationEmail,
  quotationReadyEmail,
  quotationReceivedEmail,
  type OrderEmailData,
  type QuotationEmailData,
} from './templates.commerce';

/**
 * Typed façade over the mail templates.
 * Controllers call these and move on — nothing here blocks a response.
 */
export const email = {
  welcome: (to: string, name: string): void =>
    dispatchEmail({ to, content: welcomeEmail(name) }),

  verifyAddress: (to: string, name: string, token: string): void =>
    dispatchEmail({ to, content: verifyEmail(name, token) }),

  resetPassword: (to: string, name: string, token: string): void =>
    dispatchEmail({ to, content: resetPasswordEmail(name, token) }),

  passwordChanged: (to: string, name: string): void =>
    dispatchEmail({ to, content: passwordChangedEmail(name) }),

  orderConfirmation: (to: string, data: OrderEmailData): void =>
    dispatchEmail({ to, content: orderConfirmationEmail(data) }),

  newOrderAlert: (
    data: OrderEmailData & { customerPhone: string; customerEmail: string },
  ): void =>
    dispatchEmail({
      to: env.ADMIN_EMAIL,
      content: newOrderAlertEmail(data),
      replyTo: data.customerEmail,
    }),

  quotationReceived: (to: string, data: QuotationEmailData): void =>
    dispatchEmail({ to, content: quotationReceivedEmail(data) }),

  quotationReady: (
    to: string,
    data: QuotationEmailData & { total: number; validUntil?: string },
  ): void => dispatchEmail({ to, content: quotationReadyEmail(data) }),

  newQuotationAlert: (
    data: QuotationEmailData & { customerPhone: string; customerEmail: string; company?: string },
  ): void =>
    dispatchEmail({
      to: env.ADMIN_EMAIL,
      content: newQuotationAlertEmail(data),
      replyTo: data.customerEmail,
    }),

  contactAlert: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    source: string;
  }): void =>
    dispatchEmail({ to: env.ADMIN_EMAIL, content: contactAlertEmail(data), replyTo: data.email }),
} as const;

export { sendEmail, dispatchEmail, verifyMailer } from './mailer';
export type { EmailContent } from './templates.auth';
export type { OrderEmailData, QuotationEmailData } from './templates.commerce';
```

## `server/src/services/email/layout.ts`

```ts
import { CONTACT, SITE } from './constants';

/**
 * Shared HTML shell for every transactional email.
 *
 * Table-based and inline-styled on purpose: Gmail, Outlook and most Pakistani
 * webmail clients strip <style> blocks and ignore flexbox.
 */

const NAVY = '#1B2A6B';
const DARK = '#0F1B4C';
const CYAN = '#00AEEF';
const SURFACE = '#F7F9FC';
const INK = '#1A1A1A';
const MUTED = '#5A6472';

export interface LayoutOptions {
  title: string;
  preheader: string;
  body: string;
  cta?: { label: string; url: string };
}

export function button(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:${CYAN};border-radius:6px;">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a>
      </td></tr>
    </table>`;
}

/** Key/value block used by order and quotation emails. */
export function detailRows(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
    ${rows
      .map(
        ({ label, value }) => `<tr>
        <td style="padding:6px 0;color:${MUTED};width:45%;">${label}</td>
        <td style="padding:6px 0;color:${INK};font-weight:bold;">${value}</td>
      </tr>`,
      )
      .join('')}
  </table>`;
}

/** Line-item table used by order and quotation emails. */
export function itemsTable(
  items: { name: string; sku: string; qty: number; amount?: string }[],
): string {
  const header = `<tr style="background:${SURFACE};">
      <th align="left" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Item</th>
      <th align="center" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Qty</th>
      ${items.some((i) => i.amount) ? `<th align="right" style="padding:10px;font-size:12px;color:${MUTED};text-transform:uppercase;">Amount</th>` : ''}
    </tr>`;

  const rows = items
    .map(
      (item) => `<tr style="border-bottom:1px solid #E5E9F0;">
      <td style="padding:10px;font-size:14px;color:${INK};">${item.name}<br><span style="font-size:12px;color:${MUTED};">SKU: ${item.sku}</span></td>
      <td align="center" style="padding:10px;font-size:14px;color:${INK};">${item.qty}</td>
      ${item.amount ? `<td align="right" style="padding:10px;font-size:14px;color:${INK};">${item.amount}</td>` : ''}
    </tr>`,
    )
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">${header}${rows}</table>`;
}

export function renderEmail({ title, preheader, body, cta }: LayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${SURFACE};">
<span style="display:none;font-size:1px;color:${SURFACE};max-height:0;overflow:hidden;">${preheader}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${SURFACE};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(27,42,107,0.08);">

      <tr><td style="background:linear-gradient(135deg,${DARK},${NAVY});background-color:${NAVY};padding:28px 32px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">FAST TRADERS</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${CYAN};margin-top:4px;">${SITE.tagline}</div>
      </td></tr>

      <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
        <h1 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${title}</h1>
        ${body}
        ${cta ? button(cta.label, cta.url) : ''}
      </td></tr>

      <tr><td style="background:${SURFACE};padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};">
        <strong style="color:${NAVY};">Fast Traders</strong><br>
        ${CONTACT.address}<br>
        Mobile / WhatsApp: <a href="tel:${CONTACT.mobile.replace(/\s/g, '')}" style="color:${NAVY};">${CONTACT.mobile}</a> &nbsp;·&nbsp;
        Landline: <a href="tel:${CONTACT.landline.replace(/\s/g, '')}" style="color:${NAVY};">${CONTACT.landline}</a><br>
        <a href="mailto:${CONTACT.email}" style="color:${NAVY};">${CONTACT.email}</a> &nbsp;·&nbsp;
        <a href="${SITE.url}" style="color:${NAVY};">${SITE.domain}</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
```

## `server/src/services/email/mailer.ts`

```ts
import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProduction, isTest } from '../../config/env';
import { logger } from '../../config/logger';
import type { EmailContent } from './templates.auth';

/**
 * Nodemailer transport.
 *
 * Created lazily so importing this module never opens a socket (matters for
 * the seeder and for tests). Delivery is fire-and-forget: a failed email must
 * never fail the HTTP request that triggered it.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: 3,
    // Pakistani SMTP round trips can be slow; be patient before giving up.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export interface SendOptions {
  to: string | string[];
  content: EmailContent;
  replyTo?: string;
}

/** Await this only when the caller genuinely needs the delivery result. */
export async function sendEmail({ to, content, replyTo }: SendOptions): Promise<boolean> {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (isTest) {
    logger.debug(`[mail] suppressed in test: "${content.subject}" -> ${recipients}`);
    return true;
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: recipients,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
    });
    logger.info(`[mail] sent "${content.subject}" -> ${recipients}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[mail] FAILED "${content.subject}" -> ${recipients}: ${message}`);
    return false;
  }
}

/**
 * Dispatch without blocking the response.
 * Every rejection is already swallowed inside `sendEmail`, so this can never
 * produce an unhandled rejection.
 */
export function dispatchEmail(options: SendOptions): void {
  void sendEmail(options);
}

/** Verify SMTP credentials at boot; logs a warning rather than crashing. */
export async function verifyMailer(): Promise<void> {
  if (isTest) return;
  try {
    await getTransporter().verify();
    logger.info('[mail] SMTP connection verified');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const level = isProduction ? 'error' : 'warn';
    logger[level](`[mail] SMTP verification failed — emails will not send: ${message}`);
  }
}
```

## `server/src/services/email/templates.auth.ts`

```ts
import { SITE } from './constants';
import { renderEmail } from './layout';

/** Account lifecycle emails: welcome, address verification, password reset. */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(name: string): EmailContent {
  const subject = 'Welcome to Fast Traders';
  return {
    subject,
    html: renderEmail({
      title: `Welcome, ${name}`,
      preheader: 'Your Fast Traders account is ready.',
      body: `<p>Thank you for creating an account with Fast Traders.</p>
        <p>You can now track your orders, save delivery addresses and send us a
        request for quotation straight from your inquiry cart — handy when you
        are pricing a full panel build.</p>
        <p>Need something urgently? WhatsApp us on <strong>+92 324 4234990</strong>
        and we will check stock at the Bull Road counter for you.</p>`,
      cta: { label: 'Browse the catalogue', url: `${SITE.url}/products` },
    }),
    text: `Welcome, ${name}. Your Fast Traders account is ready. Browse the catalogue at ${SITE.url}/products or WhatsApp +92 324 4234990.`,
  };
}

export function verifyEmail(name: string, token: string): EmailContent {
  const url = `${SITE.url}/verify-email/${token}`;
  return {
    subject: 'Verify your email address',
    html: renderEmail({
      title: 'Confirm your email address',
      preheader: 'One click to verify your Fast Traders account.',
      body: `<p>Hello ${name},</p>
        <p>Please confirm this email address so we can send you order updates
        and quotations.</p>
        <p style="font-size:13px;color:#5A6472;">This link expires in 24 hours.
        If you did not create a Fast Traders account, you can ignore this email.</p>`,
      cta: { label: 'Verify email address', url },
    }),
    text: `Hello ${name}, confirm your Fast Traders email address: ${url} (expires in 24 hours).`,
  };
}

export function resetPasswordEmail(name: string, token: string): EmailContent {
  const url = `${SITE.url}/reset-password/${token}`;
  return {
    subject: 'Reset your Fast Traders password',
    html: renderEmail({
      title: 'Reset your password',
      preheader: 'A password reset was requested for your account.',
      body: `<p>Hello ${name},</p>
        <p>We received a request to reset the password on your Fast Traders
        account. Use the button below to choose a new one.</p>
        <p style="font-size:13px;color:#5A6472;">This link expires in 30 minutes
        and can only be used once. If you did not request a reset, no action is
        needed — your password has not changed.</p>`,
      cta: { label: 'Choose a new password', url },
    }),
    text: `Hello ${name}, reset your Fast Traders password: ${url} (expires in 30 minutes). If you did not request this, ignore this email.`,
  };
}

export function passwordChangedEmail(name: string): EmailContent {
  return {
    subject: 'Your Fast Traders password was changed',
    html: renderEmail({
      title: 'Password changed',
      preheader: 'Confirmation that your password was updated.',
      body: `<p>Hello ${name},</p>
        <p>The password on your Fast Traders account was just changed, and every
        other signed-in device has been logged out.</p>
        <p><strong>If this was not you</strong>, contact us immediately on
        +92 324 4234990 or reply to this email.</p>`,
    }),
    text: `Hello ${name}, your Fast Traders password was changed and other sessions were signed out. If this was not you, call +92 324 4234990.`,
  };
}
```

## `server/src/services/email/templates.commerce.ts`

```ts
import { SITE, formatPKR } from './constants';
import { detailRows, itemsTable, renderEmail } from './layout';
import type { EmailContent } from './templates.auth';

/** Order, quotation and enquiry emails. */

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: { name: string; sku: string; qty: number; price: number }[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  shippingCity: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

function orderTotals(data: OrderEmailData): { label: string; value: string }[] {
  const rows = [{ label: 'Subtotal', value: formatPKR(data.subtotal) }];
  if (data.discount > 0) rows.push({ label: 'Discount', value: `− ${formatPKR(data.discount)}` });
  if (data.taxAmount > 0) rows.push({ label: 'Sales tax', value: formatPKR(data.taxAmount) });
  rows.push({ label: 'Delivery', value: data.shippingCost > 0 ? formatPKR(data.shippingCost) : 'Free' });
  rows.push({ label: 'Total payable', value: formatPKR(data.total) });
  return rows;
}

export function orderConfirmationEmail(data: OrderEmailData): EmailContent {
  const items = data.items.map((item) => ({
    name: item.name,
    sku: item.sku,
    qty: item.qty,
    amount: formatPKR(item.price * item.qty),
  }));

  return {
    subject: `Order ${data.orderNumber} confirmed — Fast Traders`,
    html: renderEmail({
      title: `Thank you, ${data.customerName}`,
      preheader: `We have received order ${data.orderNumber}.`,
      body: `<p>We have received your order and our team is preparing it now.
        You will get another email as soon as it ships.</p>
        ${detailRows([
          { label: 'Order number', value: data.orderNumber },
          { label: 'Payment method', value: PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod },
          { label: 'Delivering to', value: data.shippingCity },
        ])}
        ${itemsTable(items)}
        ${detailRows(orderTotals(data))}
        <p style="font-size:13px;color:#5A6472;">Questions about this order?
        WhatsApp +92 324 4234990 and quote your order number.</p>`,
      cta: { label: 'View your order', url: `${SITE.url}/orders/${data.orderNumber}` },
    }),
    text: `Thank you, ${data.customerName}. Order ${data.orderNumber} confirmed. Total ${formatPKR(data.total)}. Track it at ${SITE.url}/orders/${data.orderNumber}`,
  };
}

export function newOrderAlertEmail(data: OrderEmailData & { customerPhone: string; customerEmail: string }): EmailContent {
  const items = data.items.map((item) => ({
    name: item.name,
    sku: item.sku,
    qty: item.qty,
    amount: formatPKR(item.price * item.qty),
  }));

  return {
    subject: `NEW ORDER ${data.orderNumber} — ${formatPKR(data.total)}`,
    html: renderEmail({
      title: `New order: ${data.orderNumber}`,
      preheader: `${data.customerName} — ${formatPKR(data.total)}`,
      body: `${detailRows([
        { label: 'Customer', value: data.customerName },
        { label: 'Phone', value: data.customerPhone },
        { label: 'Email', value: data.customerEmail },
        { label: 'City', value: data.shippingCity },
        { label: 'Payment', value: PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod },
      ])}
      ${itemsTable(items)}
      ${detailRows(orderTotals(data))}`,
      cta: { label: 'Open in admin', url: `${SITE.url}/admin/orders/${data.orderNumber}` },
    }),
    text: `New order ${data.orderNumber} from ${data.customerName} (${data.customerPhone}) — ${formatPKR(data.total)}.`,
  };
}

export interface QuotationEmailData {
  quoteNumber: string;
  customerName: string;
  items: { name: string; sku: string; qty: number }[];
  message?: string;
}

export function quotationReceivedEmail(data: QuotationEmailData): EmailContent {
  return {
    subject: `We received your quotation request ${data.quoteNumber}`,
    html: renderEmail({
      title: 'Your request is with our team',
      preheader: `Quotation request ${data.quoteNumber} received.`,
      body: `<p>Hello ${data.customerName},</p>
        <p>Thank you for your enquiry. Our team is checking stock and pricing,
        and will send your quotation within one working day.</p>
        ${detailRows([{ label: 'Reference', value: data.quoteNumber }])}
        ${itemsTable(data.items)}
        ${data.message ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;font-size:14px;"><strong>Your note:</strong><br>${data.message}</p>` : ''}`,
      cta: { label: 'View your request', url: `${SITE.url}/quotations/${data.quoteNumber}` },
    }),
    text: `Hello ${data.customerName}, we received quotation request ${data.quoteNumber} and will respond within one working day.`,
  };
}

export function quotationReadyEmail(
  data: QuotationEmailData & { total: number; validUntil?: string },
): EmailContent {
  return {
    subject: `Your quotation ${data.quoteNumber} is ready — Fast Traders`,
    html: renderEmail({
      title: 'Your quotation is ready',
      preheader: `Quotation ${data.quoteNumber}: ${formatPKR(data.total)}`,
      body: `<p>Hello ${data.customerName},</p>
        <p>We have priced your request. Review it below and accept online, or
        reply with a counter-offer and we will take another look.</p>
        ${detailRows([
          { label: 'Reference', value: data.quoteNumber },
          { label: 'Quoted total', value: formatPKR(data.total) },
          ...(data.validUntil ? [{ label: 'Valid until', value: data.validUntil }] : []),
        ])}
        ${itemsTable(data.items)}`,
      cta: { label: 'Review the quotation', url: `${SITE.url}/quotations/${data.quoteNumber}` },
    }),
    text: `Hello ${data.customerName}, quotation ${data.quoteNumber} is ready — ${formatPKR(data.total)}. Review it at ${SITE.url}/quotations/${data.quoteNumber}`,
  };
}

export function newQuotationAlertEmail(
  data: QuotationEmailData & { customerPhone: string; customerEmail: string; company?: string },
): EmailContent {
  return {
    subject: `NEW RFQ ${data.quoteNumber} — ${data.items.length} line(s)`,
    html: renderEmail({
      title: `New quotation request: ${data.quoteNumber}`,
      preheader: `${data.customerName} requested a quotation.`,
      body: `${detailRows([
        { label: 'Customer', value: data.customerName },
        ...(data.company ? [{ label: 'Company', value: data.company }] : []),
        { label: 'Phone', value: data.customerPhone },
        { label: 'Email', value: data.customerEmail },
      ])}
      ${itemsTable(data.items)}
      ${data.message ? `<p style="background:#F7F9FC;padding:12px;border-radius:6px;"><strong>Note:</strong><br>${data.message}</p>` : ''}`,
      cta: { label: 'Price this RFQ', url: `${SITE.url}/admin/quotations/${data.quoteNumber}` },
    }),
    text: `New RFQ ${data.quoteNumber} from ${data.customerName} (${data.customerPhone}), ${data.items.length} line(s).`,
  };
}

export function contactAlertEmail(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
}): EmailContent {
  return {
    subject: `Website enquiry: ${data.subject}`,
    html: renderEmail({
      title: 'New website enquiry',
      preheader: `${data.name}: ${data.subject}`,
      body: `${detailRows([
        { label: 'Name', value: data.name },
        { label: 'Email', value: data.email },
        ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
        { label: 'Source', value: data.source },
      ])}
      <p style="background:#F7F9FC;padding:14px;border-radius:6px;white-space:pre-wrap;">${data.message}</p>`,
    }),
    text: `Website enquiry from ${data.name} (${data.email}): ${data.subject}\n\n${data.message}`,
  };
}
```

## `server/src/controllers/address.controller.ts`

```ts
import type { Request, Response } from 'express';
import { User, type UserDocument } from '../models';
import { toPublicUser } from '../services/auth.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { CreateAddressInput, UpdateAddressInput } from '../validators';

/**
 * Address book CRUD, nested under /auth/me/addresses.
 * Addresses are subdocuments, so the index in the array is the identifier —
 * `_id: false` on the schema keeps the payload small.
 */

const MAX_ADDRESSES = 8;

async function loadUser(req: Request): Promise<UserDocument> {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');
  return user;
}

function parseIndex(req: Request, length: number): number {
  const raw = (req.params as { index?: string }).index ?? '';
  const index = Number(raw);

  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw ApiError.notFound('Address not found');
  }
  return index;
}

export async function listAddresses(req: Request, res: Response): Promise<void> {
  const user = await loadUser(req);
  sendSuccess(res, user.addresses, 'Addresses');
}

export async function addAddress(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateAddressInput;
  const user = await loadUser(req);

  if (user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save at most ${MAX_ADDRESSES} addresses`);
  }

  // A new default demotes the previous one; the model hook guarantees exactly one.
  if (input.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  user.addresses.push(input);
  await user.save();

  sendCreated(res, toPublicUser(user).addresses, 'Address added');
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateAddressInput;
  const user = await loadUser(req);

  const index = parseIndex(req, user.addresses.length);
  const target = user.addresses[index];
  if (!target) throw ApiError.notFound('Address not found');

  if (input.isDefault) {
    user.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  Object.assign(target, input);
  await user.save();

  sendSuccess(res, user.addresses, 'Address updated');
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  const user = await loadUser(req);

  const index = parseIndex(req, user.addresses.length);
  user.addresses.splice(index, 1);
  await user.save();

  sendSuccess(res, user.addresses, 'Address removed');
}
```

## `server/src/controllers/auth.controller.ts`

```ts
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { REFRESH_TOKEN_COOKIE } from '../middleware/auth';
import { User } from '../models';
import { email } from '../services/email';
import * as authService from '../services/auth.service';
import { mergeGuestCarts } from '../services/cart.service';
import { recordAudit } from '../services/audit.service';
import { readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { clearAuthCookies, clearSessionCookie, setAuthCookies } from '../utils/cookies';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators';

/** Read the refresh token from its httpOnly cookie, falling back to the body. */
function extractRefreshToken(req: Request): string {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[REFRESH_TOKEN_COOKIE];
  const body = req.body as { refreshToken?: string } | undefined;
  const token = fromCookie ?? body?.refreshToken;

  if (!token) throw ApiError.unauthorized('No refresh token provided');
  return token;
}

function verifyRefreshToken(token: string): string {
  const decoded: unknown = jwt.verify(token, env.JWT_REFRESH_SECRET);
  const payload = decoded as { sub?: unknown; tokenType?: unknown };

  if (typeof payload.sub !== 'string' || payload.tokenType !== 'refresh') {
    throw ApiError.unauthorized('Malformed refresh token');
  }
  return payload.sub;
}

/* ------------------------------- Register -------------------------------- */

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;

  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.password,
    ...(input.companyName ? { companyName: input.companyName } : {}),
  });

  const verifyToken = await authService.createEmailVerifyToken(user);
  email.welcome(user.email, user.name);
  email.verifyAddress(user.email, user.name, verifyToken);

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  await mergeGuestCarts(readSessionId(req), user._id.toString());
  clearSessionCookie(res);

  sendCreated(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Account created. Please check your email to verify your address.',
  );
}

/* --------------------------------- Login --------------------------------- */

export async function login(req: Request, res: Response): Promise<void> {
  const { email: address, password } = req.body as LoginInput;

  const user = await authService.authenticate(address, password);
  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);

  // Carry an anonymous cart into the account, then retire the guest cookie.
  await mergeGuestCarts(readSessionId(req), user._id.toString());
  clearSessionCookie(res);

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Signed in successfully',
  );
}

/* -------------------------------- Refresh -------------------------------- */

export async function refresh(req: Request, res: Response): Promise<void> {
  const presented = extractRefreshToken(req);
  const userId = verifyRefreshToken(presented);

  const { user, tokens } = await authService.rotateRefreshToken(userId, presented);
  setAuthCookies(res, tokens);

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Session refreshed',
  );
}

/* --------------------------------- Logout -------------------------------- */

export async function logout(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const presented = cookies?.[REFRESH_TOKEN_COOKIE];

  if (presented) {
    try {
      const userId = verifyRefreshToken(presented);
      await authService.revokeRefreshToken(userId, presented);
    } catch {
      // An expired or forged token still results in a clean logout.
    }
  }

  clearAuthCookies(res);
  sendSuccess(res, null, 'Signed out');
}

/* ---------------------------------- Me ----------------------------------- */

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');

  sendSuccess(res, authService.toPublicUser(user), 'Current user');
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateProfileInput;

  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.companyName !== undefined) user.companyName = input.companyName ?? undefined;
  if (input.ntn !== undefined) user.ntn = input.ntn ?? undefined;

  await user.save();
  sendSuccess(res, authService.toPublicUser(user), 'Profile updated');
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await User.findById(req.user?.id).select('+passwordHash +refreshTokens');
  if (!user) throw ApiError.notFound('Account not found');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Your current password is incorrect');
  }

  user.passwordHash = newPassword;
  // Changing a password signs out every other device.
  user.refreshTokens = [];
  await user.save();

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  email.passwordChanged(user.email, user.name);
  recordAudit({ req, action: 'update', entity: 'User', entityId: user._id.toString() });

  sendSuccess(res, { accessToken: tokens.accessToken }, 'Password changed. Other devices signed out.');
}
```

## `server/src/controllers/brand.controller.ts`

```ts
import type { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Brand, Product, type IBrand } from '../models';
import { sendSuccess } from '../utils/ApiResponse';

/** Public brand listing. */

type LeanBrand = IBrand & { _id: Types.ObjectId };

export async function listBrands(req: Request, res: Response): Promise<void> {
  const { featuredOnly, withCounts } = req.query as unknown as {
    featuredOnly: boolean;
    withCounts: boolean;
  };

  const brands = await Brand.find({ isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) })
    .sort({ displayOrder: 1, name: 1 })
    .lean<LeanBrand[]>();

  if (!withCounts) {
    sendSuccess(res, brands, `${brands.length} brand(s)`);
    return;
  }

  const rows = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id.toString(), row.count]));

  sendSuccess(
    res,
    brands.map((brand) => ({ ...brand, productCount: counts.get(brand._id.toString()) ?? 0 })),
    `${brands.length} brand(s)`,
  );
}
```

## `server/src/controllers/cart.controller.ts`

```ts
import type { Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { hydrateCart } from '../services/cart.view';
import { cartOwner, ensureSessionId } from '../services/session.service';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { CartType } from '../types';
import type { AddCartItemInput, UpdateCartItemInput } from '../validators';

/**
 * Controllers for both carts. The route layer binds `type`, so
 * `/cart/items` and `/inquiry/items` share one implementation.
 */

function owner(req: Request, res: Response): cartService.CartOwner {
  // Guests get a session cookie on first touch; signed-in users never need one.
  const sessionId = req.user ? null : ensureSessionId(req, res);
  return cartOwner(req, sessionId);
}

export interface CartController {
  get: (req: Request, res: Response) => Promise<void>;
  add: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
  clear: (req: Request, res: Response) => Promise<void>;
}

export function makeCartController(type: CartType): CartController {
  const noun = type === 'shopping' ? 'Cart' : 'Inquiry list';

  return {
    get: async (req: Request, res: Response): Promise<void> => {
      const cart = await cartService.getOrCreateCart(owner(req, res), type);
      sendSuccess(res, await hydrateCart(cart), `${noun} contents`);
    },

    add: async (req: Request, res: Response): Promise<void> => {
      const input = req.body as AddCartItemInput;
      const cart = await cartService.addItem(owner(req, res), type, input);
      sendCreated(res, await hydrateCart(cart), `Added to your ${noun.toLowerCase()}`);
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params as { productId: string };
      const { variant } = req.query as { variant?: string };
      const patch = req.body as UpdateCartItemInput;

      const cart = await cartService.updateItem(owner(req, res), type, productId, {
        ...patch,
        ...(variant ? { variant } : {}),
      });
      sendSuccess(res, await hydrateCart(cart), `${noun} updated`);
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      const { productId } = req.params as { productId: string };
      const { variant } = req.query as { variant?: string };

      const cart = await cartService.removeItem(owner(req, res), type, productId, variant);
      sendSuccess(res, await hydrateCart(cart), `Removed from your ${noun.toLowerCase()}`);
    },

    clear: async (req: Request, res: Response): Promise<void> => {
      const cart = await cartService.clearCart(owner(req, res), type);
      sendSuccess(res, await hydrateCart(cart), `${noun} emptied`);
    },
  };
}

export const shoppingCartController = makeCartController('shopping');
export const inquiryCartController = makeCartController('inquiry');
```

## `server/src/controllers/category.controller.ts`

```ts
import type { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Category, Product, type ICategory } from '../models';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';

/** Category tree and detail endpoints. */

type LeanCategory = ICategory & { _id: Types.ObjectId };

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  level: number;
  displayOrder: number;
  isFeatured: boolean;
  productCount: number;
  children: CategoryNode[];
}

/** Count active products per category, including products in child categories. */
async function productCounts(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: Types.ObjectId | null; count: number }>([
    { $match: { isActive: true } },
    {
      $facet: {
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
        bySub: [{ $match: { subCategory: { $ne: null } } }, { $group: { _id: '$subCategory', count: { $sum: 1 } } }],
      },
    },
    { $project: { rows: { $concatArrays: ['$byCategory', '$bySub'] } } },
    { $unwind: '$rows' },
    { $group: { _id: '$rows._id', count: { $sum: '$rows.count' } } },
  ]);

  return new Map(rows.filter((row) => row._id !== null).map((row) => [String(row._id), row.count]));
}

/** Assemble a flat category list into a nested tree. */
function buildTree(
  categories: LeanCategory[],
  counts: Map<string, number>,
  includeEmpty: boolean,
): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();

  for (const category of categories) {
    nodes.set(category._id.toString(), {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      ...(category.description ? { description: category.description } : {}),
      ...(category.icon ? { icon: category.icon } : {}),
      ...(category.image ? { image: category.image } : {}),
      level: category.level,
      displayOrder: category.displayOrder,
      isFeatured: category.isFeatured,
      productCount: counts.get(category._id.toString()) ?? 0,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category._id.toString());
    if (!node) continue;

    const parent = category.parent ? nodes.get(category.parent.toString()) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // A parent's count rolls up its children so the nav never reads "0".
  const rollUp = (node: CategoryNode): number => {
    const childTotal = node.children.reduce((sum, child) => sum + rollUp(child), 0);
    node.productCount = Math.max(node.productCount, childTotal);
    return node.productCount;
  };
  roots.forEach(rollUp);

  const prune = (list: CategoryNode[]): CategoryNode[] =>
    list
      .filter((node) => includeEmpty || node.productCount > 0)
      .map((node) => ({ ...node, children: prune(node.children) }));

  return prune(roots);
}

export async function getCategoryTree(req: Request, res: Response): Promise<void> {
  const { includeEmpty, featuredOnly } = req.query as unknown as {
    includeEmpty: boolean;
    featuredOnly: boolean;
  };

  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) })
      .sort({ level: 1, displayOrder: 1, name: 1 })
      .lean<LeanCategory[]>(),
    productCounts(),
  ]);

  const tree = buildTree(categories, counts, includeEmpty);
  sendSuccess(res, tree, `${tree.length} root categor(ies)`);
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };

  const category = await Category.findOne({ slug, isActive: true })
    .populate({ path: 'ancestors', select: 'name slug' })
    .lean<LeanCategory>();

  if (!category) throw ApiError.notFound('Category not found');

  const [children, counts] = await Promise.all([
    Category.find({ parent: category._id, isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean<LeanCategory[]>(),
    productCounts(),
  ]);

  sendSuccess(
    res,
    {
      category,
      breadcrumbs: category.ancestors,
      children: children.map((child) => ({
        ...child,
        productCount: counts.get(child._id.toString()) ?? 0,
      })),
      productCount: counts.get(category._id.toString()) ?? 0,
    },
    'Category detail',
  );
}
```

## `server/src/controllers/misc.controller.ts`

```ts
import type { Request, Response } from 'express';
import { Banner, Contact, Newsletter, Setting } from '../models';
import { email } from '../services/email';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import type { ContactInput } from '../validators';

/** Contact form, newsletter, public settings and banners. */

export async function submitContact(req: Request, res: Response): Promise<void> {
  const { website, ...input } = req.body as ContactInput;

  // Honeypot: a filled hidden field means a bot. Answer 201 so it learns nothing.
  if (website) {
    sendCreated(res, null, 'Thank you — we will be in touch shortly.');
    return;
  }

  const contact = await Contact.create(input);
  email.contactAlert({
    name: contact.name,
    email: contact.email,
    ...(contact.phone ? { phone: contact.phone } : {}),
    subject: contact.subject,
    message: contact.message,
    source: contact.source,
  });

  sendCreated(res, { id: contact._id.toString() }, 'Thank you — we will be in touch shortly.');
}

export async function subscribeNewsletter(req: Request, res: Response): Promise<void> {
  const { email: address } = req.body as { email: string };

  // Upsert so a re-subscribe reactivates rather than colliding on the unique index.
  const existing = await Newsletter.findOne({ email: address });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.subscribedAt = new Date();
      await existing.save();
    }
    sendSuccess(res, null, 'You are subscribed');
    return;
  }

  await Newsletter.create({ email: address });
  sendCreated(res, null, 'Subscribed. Thank you!');
}

/** Public storefront configuration. Bank details are admin-only. */
export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await Setting.findOne({ key: 'global' })
    .select('-bankDetails -__v')
    .lean();

  sendSuccess(res, settings, settings ? 'Site settings' : 'Settings have not been configured yet');
}

export async function listBanners(req: Request, res: Response): Promise<void> {
  const { position } = req.query as { position?: string };
  const now = new Date();

  const banners = await Banner.find({
    isActive: true,
    ...(position ? { position } : {}),
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ position: 1, displayOrder: 1 })
    .lean();

  sendSuccess(res, banners, `${banners.length} banner(s)`);
}
```

## `server/src/controllers/order.controller.ts`

```ts
import type { Request, Response } from 'express';
import { Order, type OrderDocument } from '../models';
import { recordAudit } from '../services/audit.service';
import { clearCart, getOrCreateCart } from '../services/cart.service';
import { email } from '../services/email';
import * as orderService from '../services/order.service';
import { cartOwner, readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateOrderInput } from '../validators';

/** Customer-facing order endpoints. Guest checkout is supported throughout. */

function toEmailData(order: OrderDocument): Parameters<typeof email.orderConfirmation>[1] {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      price: item.price,
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod,
    shippingCity: order.shippingAddress.city,
  };
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateOrderInput;

  const owner = cartOwner(req, readSessionId(req));
  const cart = await getOrCreateCart(owner, 'shopping');

  const order = await orderService.createOrder({
    userId: req.user?.id ?? null,
    cartItems: cart.items,
    input,
  });

  await clearCart(owner, 'shopping');

  const emailData = toEmailData(order);
  email.orderConfirmation(order.customer.email, emailData);
  email.newOrderAlert({
    ...emailData,
    customerPhone: order.customer.phone,
    customerEmail: order.customer.email,
  });

  recordAudit({
    req,
    action: 'create',
    entity: 'Order',
    entityId: order._id.toString(),
    after: { orderNumber: order.orderNumber, total: order.total },
  });

  sendCreated(res, order.toJSON(), `Order ${order.orderNumber} placed`);
}

export async function listMyOrders(req: Request, res: Response): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };

  const filter = { user: req.user?.id, ...(status ? { orderStatus: status } : {}) };

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} order(s)`);
}

/**
 * Order lookup by number. A signed-in customer sees their own orders; admins
 * and managers see any. Guests must supply the email used at checkout, which
 * keeps order numbers from being enumerable.
 */
export async function getOrder(req: Request, res: Response): Promise<void> {
  const { orderNumber } = req.params as { orderNumber: string };
  const { email: guestEmail } = req.query as { email?: string };

  const order = await Order.findOne({ orderNumber });
  if (!order) throw ApiError.notFound('Order not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && order.user?.toString() === req.user.id);
  const isGuestMatch =
    !req.user &&
    typeof guestEmail === 'string' &&
    guestEmail.toLowerCase() === order.customer.email.toLowerCase();

  if (!isStaff && !isOwner && !isGuestMatch) {
    throw ApiError.forbidden('You do not have access to this order');
  }

  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber}`);
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { reason } = req.body as { reason?: string };

  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && order.user?.toString() === req.user.id);
  if (!isStaff && !isOwner) throw ApiError.forbidden('You do not have access to this order');

  const previousStatus = order.orderStatus;
  await orderService.cancelOrder(order, reason);

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Order',
    entityId: order._id.toString(),
    before: { orderStatus: previousStatus },
    after: { orderStatus: 'cancelled', reason },
  });

  sendSuccess(res, order.toJSON(), `Order ${order.orderNumber} cancelled and stock released`);
}
```

## `server/src/controllers/password.controller.ts`

```ts
import type { Request, Response } from 'express';
import { User } from '../models';
import * as authService from '../services/auth.service';
import { email } from '../services/email';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { setAuthCookies } from '../utils/cookies';

/** Password reset and email verification — the token-driven auth flows. */

/**
 * Always answers 200 with the same message, whether or not the address exists.
 * Anything else turns this endpoint into an account-enumeration oracle.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email: address } = req.body as { email: string };
  const genericMessage = 'If that email is registered, a reset link is on its way.';

  const user = await User.findOne({ email: address }).select(
    '+resetPasswordToken +resetPasswordExpiry',
  );

  if (user?.isActive) {
    const token = await authService.createPasswordResetToken(user);
    email.resetPassword(user.email, user.name, token);
  }

  sendSuccess(res, null, genericMessage);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token } = req.params as { token: string };
  const { password } = req.body as { password: string };

  const user = await authService.findByResetToken(token);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  // A reset invalidates every existing session.
  user.refreshTokens = [];
  await user.save();

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  email.passwordChanged(user.email, user.name);

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Password reset. You are now signed in.',
  );
}

export async function verifyEmailAddress(req: Request, res: Response): Promise<void> {
  const { token } = req.params as { token: string };

  const user = await authService.findByVerifyToken(token);
  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpiry = undefined;
  await user.save();

  sendSuccess(res, { isEmailVerified: true }, 'Email address verified');
}

/** Re-send a verification link to the signed-in user. */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id).select('+emailVerifyToken +emailVerifyExpiry');
  if (!user) throw ApiError.notFound('Account not found');

  if (user.isEmailVerified) {
    sendSuccess(res, null, 'This address is already verified');
    return;
  }

  const token = await authService.createEmailVerifyToken(user);
  email.verifyAddress(user.email, user.name, token);

  sendSuccess(res, null, 'Verification email sent');
}
```

## `server/src/controllers/product.controller.ts`

```ts
import type { Request, Response } from 'express';
import * as catalog from '../services/catalog.service';
import { sendSuccess } from '../utils/ApiResponse';
import type { ProductQuery } from '../validators';

/** Public product endpoints. `costPrice` is `select: false` and never projected. */

export async function listProducts(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ProductQuery;
  const { items, meta, facets } = await catalog.listProducts(query);

  sendSuccess(res, { items, meta, facets }, `${meta.total} product(s) found`);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const { product, related } = await catalog.getProductBySlug(slug);

  sendSuccess(res, { product, related }, 'Product detail');
}

export async function getSimilar(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { limit } = req.query as unknown as { limit: number };

  const items = await catalog.getSimilarProducts(id, limit);
  sendSuccess(res, items, `${items.length} similar product(s)`);
}

export async function suggest(req: Request, res: Response): Promise<void> {
  const { q, limit } = req.query as unknown as { q: string; limit: number };

  const items = await catalog.suggest(q, limit);
  sendSuccess(res, items, `${items.length} suggestion(s)`);
}
```

## `server/src/controllers/quotation.controller.ts`

```ts
import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Product, Quotation, type IProduct, type QuotationDocument } from '../models';
import { recordAudit } from '../services/audit.service';
import { clearCart, getOrCreateCart } from '../services/cart.service';
import { email } from '../services/email';
import { cartOwner, readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateQuotationInput, RespondQuotationInput } from '../validators';

/** RFQ submission and the customer side of the negotiation. */

type LeanProduct = IProduct & { _id: Types.ObjectId };

function toEmailItems(quotation: QuotationDocument): { name: string; sku: string; qty: number }[] {
  return quotation.items.map((item) => ({ name: item.name, sku: item.sku, qty: item.qty }));
}

export async function createQuotation(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateQuotationInput;

  const owner = cartOwner(req, readSessionId(req));
  const cart = await getOrCreateCart(owner, 'inquiry');

  if (cart.items.length === 0) {
    throw ApiError.badRequest('Your inquiry list is empty');
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
  }).lean<LeanProduct[]>();
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const items = cart.items.flatMap((cartItem) => {
    const product = byId.get(cartItem.product.toString());
    if (!product || !product.isActive) return [];
    return [
      {
        product: product._id,
        name: product.name,
        sku: product.sku,
        qty: cartItem.qty,
        unit: product.unit,
        ...(cartItem.note ? { customerNote: cartItem.note } : {}),
      },
    ];
  });

  if (items.length === 0) {
    throw ApiError.badRequest('None of the items on your inquiry list are still available');
  }

  const quotation = await Quotation.create({
    user: req.user ? new Types.ObjectId(req.user.id) : null,
    customer: input.customer,
    items,
    ...(input.message ? { message: input.message } : {}),
    ...(input.requiredBy ? { requiredBy: input.requiredBy } : {}),
    status: 'new',
  });

  await clearCart(owner, 'inquiry');

  const emailItems = toEmailItems(quotation);
  email.quotationReceived(quotation.customer.email, {
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items: emailItems,
    ...(quotation.message ? { message: quotation.message } : {}),
  });
  email.newQuotationAlert({
    quoteNumber: quotation.quoteNumber,
    customerName: quotation.customer.name,
    items: emailItems,
    ...(quotation.message ? { message: quotation.message } : {}),
    customerPhone: quotation.customer.phone,
    customerEmail: quotation.customer.email,
    ...(quotation.customer.companyName ? { company: quotation.customer.companyName } : {}),
  });

  sendCreated(
    res,
    quotation.toJSON(),
    `Request ${quotation.quoteNumber} received. We will respond within one working day.`,
  );
}

export async function listMyQuotations(req: Request, res: Response): Promise<void> {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };

  const filter = { user: req.user?.id, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    Quotation.find(filter).sort({ createdAt: -1 }).skip(toSkip(page, limit)).limit(limit).lean(),
    Quotation.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} quotation(s)`);
}

async function loadAccessible(req: Request, quoteNumber: string): Promise<QuotationDocument> {
  const quotation = await Quotation.findOne({ quoteNumber });
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const { email: guestEmail } = req.query as { email?: string };
  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && quotation.user?.toString() === req.user.id);
  const isGuestMatch =
    !req.user &&
    typeof guestEmail === 'string' &&
    guestEmail.toLowerCase() === quotation.customer.email.toLowerCase();

  if (!isStaff && !isOwner && !isGuestMatch) {
    throw ApiError.forbidden('You do not have access to this quotation');
  }

  return quotation;
}

export async function getQuotation(req: Request, res: Response): Promise<void> {
  const { quoteNumber } = req.params as { quoteNumber: string };
  const quotation = await loadAccessible(req, quoteNumber);

  sendSuccess(res, quotation.toJSON(), `Quotation ${quotation.quoteNumber}`);
}

/** Customer accepts, rejects or counters a priced quotation. */
const RESPONDABLE = ['quoted', 'negotiating'] as const;

export async function respondToQuotation(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { action, message } = req.body as RespondQuotationInput;

  const quotation = await Quotation.findById(id);
  if (!quotation) throw ApiError.notFound('Quotation not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const isOwner = Boolean(req.user && quotation.user?.toString() === req.user.id);
  if (!isStaff && !isOwner) throw ApiError.forbidden('You do not have access to this quotation');

  if (!RESPONDABLE.includes(quotation.status as (typeof RESPONDABLE)[number])) {
    throw ApiError.badRequest(
      `You can only respond once we have priced your request (current status: ${quotation.status})`,
    );
  }
  if (quotation.validUntil && quotation.validUntil.getTime() < Date.now()) {
    quotation.status = 'expired';
    await quotation.save();
    throw ApiError.badRequest('This quotation has expired. Please request a fresh one.');
  }

  const previousStatus = quotation.status;
  quotation.status = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'negotiating';

  if (message) {
    const stamp = new Date().toISOString().slice(0, 10);
    quotation.adminNotes = `${quotation.adminNotes ?? ''}\n[${stamp}] Customer (${action}): ${message}`.trim();
  }

  await quotation.save();

  recordAudit({
    req,
    action: 'status_change',
    entity: 'Quotation',
    entityId: quotation._id.toString(),
    before: { status: previousStatus },
    after: { status: quotation.status, action },
  });

  const responses: Record<string, string> = {
    accept: 'Quotation accepted. Our team will confirm your order shortly.',
    reject: 'Quotation rejected. Thank you for letting us know.',
    counter: 'Counter-offer sent. We will get back to you.',
  };

  sendSuccess(res, quotation.toJSON(), responses[action] ?? 'Response recorded');
}
```

## `server/src/controllers/review.controller.ts`

```ts
import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { Order, Review } from '../models';
import { recordAudit } from '../services/audit.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { buildMeta, toSkip } from '../utils/pagination';
import type { CreateReviewInput, UpdateReviewInput } from '../validators';

/** Product reviews. Anyone can read approved ones; posting requires an account. */

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

/** True when this customer has a delivered order containing the product. */
async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const order = await Order.exists({
    user: new Types.ObjectId(userId),
    orderStatus: 'delivered',
    'items.product': new Types.ObjectId(productId),
  });
  return order !== null;
}

export async function listReviews(req: Request, res: Response): Promise<void> {
  const { page, limit, product, includePending, sort } = req.query as unknown as {
    page: number;
    limit: number;
    product?: string;
    includePending: boolean;
    sort: string;
  };

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  const filter = {
    ...(product ? { product: new Types.ObjectId(product) } : {}),
    // Only staff may see unmoderated reviews.
    ...(includePending && isStaff ? {} : { isApproved: true }),
  };

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate({ path: 'user', select: 'name' })
      .sort(SORTS[sort] ?? SORTS.newest ?? { createdAt: -1 })
      .skip(toSkip(page, limit))
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  sendSuccess(res, { items, meta: buildMeta(total, page, limit) }, `${total} review(s)`);
}

export async function createReview(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateReviewInput;
  const userId = req.user?.id;
  if (!userId) throw ApiError.unauthorized();

  if (await Review.exists({ product: input.product, user: userId })) {
    throw ApiError.conflict('You have already reviewed this product');
  }

  const review = await Review.create({
    ...input,
    user: new Types.ObjectId(userId),
    product: new Types.ObjectId(input.product),
    isVerifiedPurchase: await hasPurchased(userId, input.product),
    // Held for moderation; the post-save hook only counts approved reviews.
    isApproved: false,
  });

  sendCreated(res, review.toJSON(), 'Thank you — your review will appear once approved');
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateReviewInput;

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');
  if (review.user.toString() !== req.user?.id) {
    throw ApiError.forbidden('You can only edit your own review');
  }

  Object.assign(review, input);
  // An edit sends the review back through moderation.
  review.isApproved = false;
  await review.save();

  sendSuccess(res, review.toJSON(), 'Review updated and resubmitted for approval');
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');

  const isStaff = req.user?.role === 'admin' || req.user?.role === 'manager';
  if (!isStaff && review.user.toString() !== req.user?.id) {
    throw ApiError.forbidden('You can only delete your own review');
  }

  // findOneAndDelete (not deleteOne) so the rating-recalculation hook fires.
  await Review.findOneAndDelete({ _id: review._id });

  if (isStaff) {
    recordAudit({ req, action: 'delete', entity: 'Review', entityId: id });
  }

  sendSuccess(res, null, 'Review deleted');
}

/** Moderation — admin and manager only. */
export async function setReviewApproval(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { isApproved } = req.body as { isApproved: boolean };

  const review = await Review.findById(id);
  if (!review) throw ApiError.notFound('Review not found');

  const before = review.isApproved;
  review.isApproved = isApproved;
  await review.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Review',
    entityId: id,
    before: { isApproved: before },
    after: { isApproved },
  });

  sendSuccess(res, review.toJSON(), isApproved ? 'Review approved' : 'Review unpublished');
}
```

## `server/src/routes/auth.routes.ts`

```ts
import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as address from '../controllers/address.controller';
import * as password from '../controllers/password.controller';
import { authLimiter, passwordResetLimiter, protect, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  changePasswordSchema,
  createAddressSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenParamSchema,
  updateAddressSchema,
  updateProfileSchema,
} from '../validators';

const router: Router = Router();

/* ---------------------------- Public / limited --------------------------- */
// 5 attempts per IP per 15 minutes on everything credential-related.

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(auth.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(auth.login));
router.post('/refresh', asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(password.forgotPassword),
);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate({ params: tokenParamSchema, body: resetPasswordSchema }),
  asyncHandler(password.resetPassword),
);
router.post(
  '/verify-email/:token',
  validate({ params: tokenParamSchema }),
  asyncHandler(password.verifyEmailAddress),
);

/* -------------------------------- Private -------------------------------- */

router.use(protect);

router.get('/me', asyncHandler(auth.getMe));
router.patch('/me', validate({ body: updateProfileSchema }), asyncHandler(auth.updateMe));
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(auth.updatePassword),
);
router.post('/me/resend-verification', passwordResetLimiter, asyncHandler(password.resendVerification));

/* ----------------------------- Address book ------------------------------ */

router.get('/me/addresses', asyncHandler(address.listAddresses));
router.post(
  '/me/addresses',
  validate({ body: createAddressSchema }),
  asyncHandler(address.addAddress),
);
router.patch(
  '/me/addresses/:index',
  validate({ body: updateAddressSchema }),
  asyncHandler(address.updateAddress),
);
router.delete('/me/addresses/:index', asyncHandler(address.deleteAddress));

export default router;
```

## `server/src/routes/brand.routes.ts`

```ts
import { Router } from 'express';
import { listBrands } from '../controllers/brand.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { brandQuerySchema } from '../validators';

const router: Router = Router();

router.get('/', validate({ query: brandQuerySchema }), asyncHandler(listBrands));

export default router;
```

## `server/src/routes/cart.routes.ts`

```ts
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
```

## `server/src/routes/category.routes.ts`

```ts
import { Router } from 'express';
import * as categories from '../controllers/category.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { categoryTreeQuerySchema, slugParamSchema } from '../validators';

const router: Router = Router();

router.get(
  '/',
  validate({ query: categoryTreeQuerySchema }),
  asyncHandler(categories.getCategoryTree),
);
router.get('/:slug', validate({ params: slugParamSchema }), asyncHandler(categories.getCategory));

export default router;
```

## `server/src/routes/health.routes.ts`

```ts
import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { sendSuccess } from '../utils/ApiResponse';

/**
 * Liveness / readiness probe. Used by Railway/Render health checks and by
 * uptime monitoring.
 */
const router: Router = Router();

const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get('/', (_req, res) => {
  const dbState = READY_STATES[mongoose.connection.readyState] ?? 'unknown';

  sendSuccess(
    res,
    {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: dbState,
      timestamp: new Date().toISOString(),
    },
    'Fast Traders API is healthy',
  );
});

export default router;
```

## `server/src/routes/index.ts`

```ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import brandRoutes from './brand.routes';
import categoryRoutes from './category.routes';
import healthRoutes from './health.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import quotationRoutes from './quotation.routes';
import reviewRoutes from './review.routes';
import searchRoutes from './search.routes';
import { createCartRouter } from './cart.routes';
import { bannerRouter, contactRouter, newsletterRouter, settingsRouter } from './misc.routes';

/**
 * `/api/v1` router.
 * Admin routers (products, orders, quotations, users, settings) land in Phase 4.
 */
const router: Router = Router();

router.use('/health', healthRoutes);

/* --------------------------------- Auth ---------------------------------- */
router.use('/auth', authRoutes);

/* ------------------------------- Catalogue ------------------------------- */
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/search', searchRoutes);

/* ------------------------------ Dual carts ------------------------------- */
router.use('/cart', createCartRouter('shopping'));
router.use('/inquiry', createCartRouter('inquiry'));

/* ------------------------------- Commerce -------------------------------- */
router.use('/orders', orderRoutes);
router.use('/quotations', quotationRoutes);
router.use('/reviews', reviewRoutes);

/* --------------------------------- Misc ---------------------------------- */
router.use('/contact', contactRouter);
router.use('/newsletter', newsletterRouter);
router.use('/settings', settingsRouter);
router.use('/banners', bannerRouter);

export default router;
```

## `server/src/routes/misc.routes.ts`

```ts
import { Router } from 'express';
import * as misc from '../controllers/misc.controller';
import { publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { bannerQuerySchema, contactSchema, newsletterSchema } from '../validators';

/** Small public endpoints that do not warrant a router each. */

export const contactRouter: Router = Router();
contactRouter.post(
  '/',
  publicWriteLimiter,
  validate({ body: contactSchema }),
  asyncHandler(misc.submitContact),
);

export const newsletterRouter: Router = Router();
newsletterRouter.post(
  '/',
  publicWriteLimiter,
  validate({ body: newsletterSchema }),
  asyncHandler(misc.subscribeNewsletter),
);

export const settingsRouter: Router = Router();
settingsRouter.get('/', asyncHandler(misc.getSettings));

export const bannerRouter: Router = Router();
bannerRouter.get('/', validate({ query: bannerQuerySchema }), asyncHandler(misc.listBanners));
```

## `server/src/routes/order.routes.ts`

```ts
import { Router } from 'express';
import * as orders from '../controllers/order.controller';
import { optionalAuth, protect, publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  cancelOrderSchema,
  createOrderSchema,
  idParamSchema,
  myOrdersQuerySchema,
  orderNumberParamSchema,
} from '../validators';

const router: Router = Router();

/** Guest checkout is allowed, so this is `optionalAuth` rather than `protect`. */
router.post(
  '/',
  optionalAuth,
  publicWriteLimiter,
  validate({ body: createOrderSchema }),
  asyncHandler(orders.createOrder),
);

router.get(
  '/my',
  protect,
  validate({ query: myOrdersQuerySchema }),
  asyncHandler(orders.listMyOrders),
);

router.post(
  '/:id/cancel',
  protect,
  validate({ params: idParamSchema, body: cancelOrderSchema }),
  asyncHandler(orders.cancelOrder),
);

/** Guests may look up an order by number plus the email used at checkout. */
router.get(
  '/:orderNumber',
  optionalAuth,
  validate({ params: orderNumberParamSchema }),
  asyncHandler(orders.getOrder),
);

export default router;
```

## `server/src/routes/product.routes.ts`

```ts
import { Router } from 'express';
import * as products from '../controllers/product.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  idParamSchema,
  productQuerySchema,
  similarQuerySchema,
  slugParamSchema,
} from '../validators';

const router: Router = Router();

/** Faceted catalogue listing. */
router.get('/', validate({ query: productQuerySchema }), asyncHandler(products.listProducts));

/** Similar products by id — registered before `/:slug` so it is not shadowed. */
router.get(
  '/:id/similar',
  validate({ params: idParamSchema, query: similarQuerySchema }),
  asyncHandler(products.getSimilar),
);

router.get('/:slug', validate({ params: slugParamSchema }), asyncHandler(products.getProduct));

export default router;
```

## `server/src/routes/quotation.routes.ts`

```ts
import { Router } from 'express';
import * as quotations from '../controllers/quotation.controller';
import { optionalAuth, protect, publicWriteLimiter, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createQuotationSchema,
  idParamSchema,
  myQuotationsQuerySchema,
  quoteNumberParamSchema,
  respondQuotationSchema,
} from '../validators';

const router: Router = Router();

/** Guest RFQs are the norm in this trade, so authentication is optional. */
router.post(
  '/',
  optionalAuth,
  publicWriteLimiter,
  validate({ body: createQuotationSchema }),
  asyncHandler(quotations.createQuotation),
);

router.get(
  '/my',
  protect,
  validate({ query: myQuotationsQuerySchema }),
  asyncHandler(quotations.listMyQuotations),
);

router.post(
  '/:id/respond',
  protect,
  validate({ params: idParamSchema, body: respondQuotationSchema }),
  asyncHandler(quotations.respondToQuotation),
);

router.get(
  '/:quoteNumber',
  optionalAuth,
  validate({ params: quoteNumberParamSchema }),
  asyncHandler(quotations.getQuotation),
);

export default router;
```

## `server/src/routes/review.routes.ts`

```ts
import { Router } from 'express';
import * as reviews from '../controllers/review.controller';
import { optionalAuth, protect, restrictTo, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  approveReviewSchema,
  createReviewSchema,
  idParamSchema,
  reviewQuerySchema,
  updateReviewSchema,
} from '../validators';

const router: Router = Router();

/** Public read — only approved reviews unless a staff member asks. */
router.get(
  '/',
  optionalAuth,
  validate({ query: reviewQuerySchema }),
  asyncHandler(reviews.listReviews),
);

router.post(
  '/',
  protect,
  validate({ body: createReviewSchema }),
  asyncHandler(reviews.createReview),
);

router.patch(
  '/:id',
  protect,
  validate({ params: idParamSchema, body: updateReviewSchema }),
  asyncHandler(reviews.updateReview),
);

router.delete(
  '/:id',
  protect,
  validate({ params: idParamSchema }),
  asyncHandler(reviews.deleteReview),
);

/** Moderation. */
router.patch(
  '/:id/approval',
  protect,
  restrictTo('admin', 'manager'),
  validate({ params: idParamSchema, body: approveReviewSchema }),
  asyncHandler(reviews.setReviewApproval),
);

export default router;
```

## `server/src/routes/search.routes.ts`

```ts
import { Router } from 'express';
import { suggest } from '../controllers/product.controller';
import { validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { suggestQuerySchema } from '../validators';

const router: Router = Router();

/** Fast autocomplete over name, SKU and manufacturer part number. */
router.get('/suggest', validate({ query: suggestQuerySchema }), asyncHandler(suggest));

export default router;
```
