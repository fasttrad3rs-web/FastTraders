import type { AuthUser } from './index';

/**
 * Augment Express's Request with the authenticated user injected by the
 * `protect` middleware. Declared globally so no controller needs a cast.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Correlation id assigned per request, echoed in logs and error bodies. */
      requestId?: string;
      /** Keys stripped by the NoSQL sanitiser, if any. */
      sanitizedKeys?: string[];
      /** Guest cart session id, resolved by `attachSession`. */
      sessionId?: string;
    }
  }
}

export {};
