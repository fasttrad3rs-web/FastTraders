import express, { type Application, type Request } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
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
  /*
   * A CSP written for THIS API, not helmet's defaults.
   *
   * This process serves JSON, not pages — so almost everything can be `'none'`.
   * That matters for the one case where a browser does render our bytes
   * directly: an error page, or a response somebody opens in a tab. With
   * `default-src 'none'` there is nothing for injected markup to load.
   *
   * The Next.js front end sets its own, stricter-where-it-matters policy; this
   * is not a substitute for that.
   *
   * NOTE we deliberately do NOT use `xss-clean`. It was last published in 2019,
   * is unmaintained, and destructively rewrites request bodies — it would
   * mangle a legitimate part number containing `<`, and this catalogue is full
   * of things like "S250-NJ <250A>". Output escaping (React), input validation
   * (Zod) and this policy cover the same ground without corrupting data.
   */
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          // Cloudinary is the only external origin any response references.
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          connectSrc: ["'self'", ...env.CLIENT_URL],
          fontSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProduction
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
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

  /*
   * Gzip every response over 1 KB.
   *
   * This audience is largely on Pakistani mobile data, and the catalogue
   * endpoints are the worst case: a page of products with full specifications
   * is mostly repeated JSON keys, which is exactly what gzip is good at. The
   * CPU cost is trivial next to the round-trip it saves on a 3G connection.
   */
  app.use(compression({ threshold: 1024 }));

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
  // No raw-body carve-out: there is no payment webhook to verify a signature
  // for, so every route can take a parsed JSON body.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  /*
   * HTTP Parameter Pollution.
   *
   * `?category=a&category=b` makes Express hand the controller an *array*
   * where every validator and every Mongo filter expects a string. Zod would
   * usually reject it, but the interesting case is the one that does not: a
   * duplicated parameter that slips into a query as `{ $in: [...] }` and
   * quietly widens it. hpp keeps the last value and moves the rest aside.
   *
   * `tags` and `specs` are whitelisted because the catalogue filter genuinely
   * accepts repeated values there — that is a real feature, not pollution.
   */
  app.use(hpp({ whitelist: ['tags', 'specs'] }));

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
