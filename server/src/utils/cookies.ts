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
