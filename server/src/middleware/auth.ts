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
