import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge guard for the admin route group.
 *
 * This is a *first* gate, not the security boundary. It only checks that an
 * access-token cookie is present and decodes to a staff role — the Edge runtime
 * has no access to `JWT_ACCESS_SECRET` and cannot verify the signature. Every
 * admin API route is independently protected by `protect + restrictTo` on the
 * server, so a forged cookie gets a 403 from the API and an empty screen here.
 *
 * The point of this middleware is UX: send a signed-out visitor to the staff
 * sign-in page instead of rendering an admin shell that fails every request.
 */

const ACCESS_TOKEN_COOKIE = 'ft_access_token';
const LOGIN_PATH = '/admin/login';
const STAFF_ROLES = new Set(['admin', 'manager']);

interface TokenPayload {
  role?: unknown;
  exp?: unknown;
}

/** Decode a JWT payload without verifying it. Edge-safe, no Node Buffer. */
function decodePayload(token: string): TokenPayload | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // The sign-in page is inside /admin, so it has to opt itself out or the
  // redirect below would loop forever.
  if (pathname === LOGIN_PATH) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = token ? decodePayload(token) : null;

  const expired = typeof payload?.exp === 'number' && payload.exp * 1000 < Date.now();
  const isStaff = typeof payload?.role === 'string' && STAFF_ROLES.has(payload.role);

  if (!payload || expired || !isStaff) {
    const login = request.nextUrl.clone();
    login.pathname = LOGIN_PATH;
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  // Admin pages must never be cached by a CDN — they are per-user by definition.
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
