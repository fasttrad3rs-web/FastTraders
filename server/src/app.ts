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
