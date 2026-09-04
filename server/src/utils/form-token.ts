import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

/**
 * Signed proof of when a form was rendered.
 *
 * The obvious implementation of "reject submissions faster than 3 seconds" is
 * to have the browser post the time it rendered the form. That is worthless:
 * the value comes from the client, so a bot simply sends a timestamp three
 * seconds in the past and sails through — while a real buyer on a bad Lahore
 * 3G connection whose clock is two minutes out gets rejected. It manages to be
 * both trivially bypassed and actively harmful.
 *
 * So the timestamp is minted and signed **server-side**. The client receives an
 * opaque string, hands it back on submit, and cannot alter it without
 * invalidating the HMAC. What we then measure is real elapsed server time.
 *
 * The secret is derived from `JWT_ACCESS_SECRET` with a distinct label so a
 * form token can never be confused with — or exchanged for — an auth token.
 */

const LABEL = 'fast-traders:form-token:v1';

/** Anything faster than this is not a person reading a form. */
export const MIN_FILL_MS = 3_000;

/**
 * Tokens go stale after two hours. Long enough that somebody can open the page,
 * go and find the part number off the panel, and come back — which is exactly
 * what this form is for — but short enough that a scraped token is not a
 * reusable key.
 */
export const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000;

function sign(issuedAt: string): string {
  return createHmac('sha256', `${LABEL}:${env.JWT_ACCESS_SECRET}`).update(issuedAt).digest('hex');
}

export function issueFormToken(now: number = Date.now()): string {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

export type FormTokenVerdict =
  | { ok: true; elapsedMs: number }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'too_fast' | 'expired' };

export function verifyFormToken(token: unknown, now: number = Date.now()): FormTokenVerdict {
  if (typeof token !== 'string') return { ok: false, reason: 'malformed' };

  const [issuedAt, signature] = token.split('.');
  if (!issuedAt || !signature || !/^\d+$/.test(issuedAt)) {
    return { ok: false, reason: 'malformed' };
  }

  const expected = sign(issuedAt);

  /*
   * `timingSafeEqual` throws on a length mismatch, so guard first. Comparing
   * with `===` would leak the signature a byte at a time to anyone patient
   * enough to measure — not a realistic threat against a spam gate, but the
   * safe comparison costs nothing and the habit is worth keeping.
   */
  if (signature.length !== expected.length) return { ok: false, reason: 'bad_signature' };
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false, reason: 'bad_signature' };
  }

  const elapsedMs = now - Number(issuedAt);
  if (elapsedMs > MAX_TOKEN_AGE_MS) return { ok: false, reason: 'expired' };

  /*
   * A negative elapsed time means the token claims to be from the future,
   * which our own signature should make impossible — treat it as too fast
   * rather than trusting it.
   */
  if (elapsedMs < MIN_FILL_MS) return { ok: false, reason: 'too_fast' };

  return { ok: true, elapsedMs };
}
