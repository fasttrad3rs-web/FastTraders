import type { CookieOptions, Response } from 'express';
import { env, isProduction } from '../config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../middleware/auth';
import type { AuthTokens } from '../types';

/**
 * Cookie helpers for the staff auth token pair and the guest inquiry session.
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

/**
 * Cookie scope, and the reason it is configurable.
 *
 * Without a `domain`, a cookie is *host-only*: set by `api.fasttraders.co`, it
 * is never sent to `fasttraders.co`. The storefront's Next.js middleware reads
 * `ft_access_token` on the Vercel host to decide whether to show the admin, so
 * a host-only cookie meant every successful login bounced straight back to the
 * sign-in page — correct credentials, HTTP 200, cookie set, and the operator
 * staring at an unchanged form with no error to explain it.
 *
 * Setting `COOKIE_DOMAIN=.fasttraders.co` scopes it to the parent so both hosts
 * receive it. It stays unset in development, where the site and API are both
 * `localhost` and a domain attribute would break the cookie entirely.
 *
 * `sameSite` follows from the same fact. When the two share a registrable
 * domain they are same-site, and `lax` is correct *and* stricter — it still
 * blocks genuine cross-site POSTs. `none` is only needed when the API and site
 * are on unrelated domains, which is exactly the case `COOKIE_DOMAIN` being
 * unset describes.
 */
function baseOptions(maxAge: number): CookieOptions {
  const domain = env.COOKIE_DOMAIN;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction && !domain ? 'none' : 'lax',
    ...(domain ? { domain } : {}),
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

/** 30 days — matches the guest TTL on the InquiryList model. */
export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_ID_COOKIE, sessionId, baseOptions(30 * 86_400_000));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_ID_COOKIE, { ...baseOptions(0), maxAge: undefined });
}
