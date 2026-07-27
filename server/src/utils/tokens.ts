import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthTokens, UserRole } from '../types/user.types';

/**
 * JWT issuing and one-time token helpers.
 * Lives outside the User model so controllers and the refresh flow can reuse it
 * without loading Mongoose.
 */

export interface TokenSubject {
  id: string;
  email: string;
  role: UserRole;
}

/** Sign a short-lived access token (default 15m). */
export function signAccessToken(subject: TokenSubject): string {
  const options = { expiresIn: env.ACCESS_EXPIRY } as SignOptions;
  return jwt.sign(
    { sub: subject.id, email: subject.email, role: subject.role },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

/** Sign a long-lived refresh token (default 7d). */
export function signRefreshToken(subject: TokenSubject): string {
  const options = { expiresIn: env.REFRESH_EXPIRY } as SignOptions;
  return jwt.sign({ sub: subject.id, tokenType: 'refresh' }, env.JWT_REFRESH_SECRET, options);
}

export function signTokenPair(subject: TokenSubject): AuthTokens {
  return {
    accessToken: signAccessToken(subject),
    refreshToken: signRefreshToken(subject),
  };
}

/**
 * Create a random token for email verification / password reset.
 * The raw value is emailed to the user; only the SHA-256 hash is stored, so a
 * database leak cannot be replayed.
 */
export function createOneTimeToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hashed: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
