import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import { setAuthCookies } from '../utils/cookies';

/**
 * Auth cookies must reach the host that reads them.
 *
 * The storefront runs on `www.fasttraders.co` (Vercel) and the API on
 * `api.fasttraders.co` (Railway). Next.js middleware reads `ft_access_token`
 * on the *storefront* host to decide whether to render the admin.
 *
 * A cookie set without a `domain` is host-only. So the API set it on
 * `api.fasttraders.co`, the middleware looked for it on `www.fasttraders.co`,
 * found nothing, and redirected back to the sign-in page. From the operator's
 * side: correct password, HTTP 200, and a login form that simply did not
 * respond — no error, because nothing had failed.
 *
 * `COOKIE_DOMAIN` scopes the cookie to the shared parent. These tests pin both
 * halves of that decision, including the `sameSite` value that follows from it.
 */

const mutable = env as unknown as { COOKIE_DOMAIN?: string; NODE_ENV: string };
const original = { domain: mutable.COOKIE_DOMAIN, nodeEnv: mutable.NODE_ENV };

/** Capture the options handed to `res.cookie` for the access token. */
function optionsFor(cookieDomain: string | undefined): CookieOptions {
  jest.resetModules();
  mutable.COOKIE_DOMAIN = cookieDomain;

  const calls: [string, string, CookieOptions][] = [];
  const res = {
    cookie: (name: string, value: string, options: CookieOptions) => {
      calls.push([name, value, options]);
    },
  } as unknown as Response;

  setAuthCookies(res, { accessToken: 'a', refreshToken: 'r' });

  const access = calls.find(([name]) => name === 'ft_access_token');
  if (!access) throw new Error('access token cookie was not set');
  return access[2];
}

describe('auth cookie scope', () => {
  afterAll(() => {
    mutable.COOKIE_DOMAIN = original.domain;
    mutable.NODE_ENV = original.nodeEnv;
  });

  it('scopes the cookie to the parent domain when configured', () => {
    const options = optionsFor('.fasttraders.co');

    // The whole point: api.* sets it, www.* must be able to read it.
    expect(options.domain).toBe('.fasttraders.co');
  });

  it('omits the domain entirely when unset, rather than sending undefined', () => {
    const options = optionsFor(undefined);

    // `domain: undefined` is not the same as absent for some cookie parsers,
    // and on localhost any domain at all stops the cookie being stored.
    expect('domain' in options).toBe(false);
  });

  it('uses sameSite lax when the hosts share a parent domain', () => {
    // Same registrable domain means same-site, so `lax` suffices — and it
    // still blocks genuine cross-site POSTs, which `none` does not.
    expect(optionsFor('.fasttraders.co').sameSite).toBe('lax');
  });

  it('always sets httpOnly, so a script can never read the token', () => {
    expect(optionsFor('.fasttraders.co').httpOnly).toBe(true);
  });

  it('sets both the access and refresh cookies with the same scope', () => {
    mutable.COOKIE_DOMAIN = '.fasttraders.co';
    const calls: [string, CookieOptions][] = [];
    const res = {
      cookie: (name: string, _value: string, options: CookieOptions) => {
        calls.push([name, options]);
      },
    } as unknown as Response;

    setAuthCookies(res, { accessToken: 'a', refreshToken: 'r' });

    expect(calls.map(([name]) => name)).toEqual(['ft_access_token', 'ft_refresh_token']);
    // A refresh cookie the middleware host cannot see is the same bug again.
    expect(calls.every(([, options]) => options.domain === '.fasttraders.co')).toBe(true);
  });
});
