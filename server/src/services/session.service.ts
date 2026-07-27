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
