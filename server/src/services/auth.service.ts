import { User, type UserDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { createOneTimeToken, hashToken } from '../utils/tokens';
import type { AuthTokens, User as PublicUser } from '../types';

/**
 * Authentication domain logic: credential checks, refresh-token rotation with
 * reuse detection, and one-time token issuing.
 *
 * Refresh tokens are stored as SHA-256 hashes, so a database leak cannot be
 * replayed against the API.
 */

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Project a user document down to the public API shape. */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    ...(user.lastLogin ? { lastLogin: user.lastLogin.toISOString() } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Verify credentials. Uses one generic message so emails cannot be enumerated. */
/**
 * Lock an account after this many consecutive failures.
 *
 * Ten, not five: the IP limiter already stops fast guessing, so this exists
 * for the distributed case. Set it too low and a staff member who mistypes on
 * a phone keyboard locks themselves out of the inquiry list during business
 * hours, which is a real cost against a mostly theoretical attack.
 */
export const MAX_FAILED_LOGINS = 10;

/** Long enough to make guessing pointless, short enough to wait out. */
export const LOCKOUT_MS = 30 * 60 * 1000;

export async function authenticate(email: string, password: string): Promise<UserDocument> {
  const user = await User.findOne({ email }).select(
    '+passwordHash +refreshTokens +failedLoginAttempts +lockedUntil',
  );

  /*
   * No user and wrong password produce the *same* error, deliberately. A
   * distinct "no such account" reply turns this endpoint into a directory of
   * who works here.
   */
  if (!user) throw ApiError.unauthorized('Incorrect email or password');

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw ApiError.forbidden(
      `Too many failed sign-in attempts. Try again in ${minutes} minute(s), or call the office.`,
    );
  }

  if (!(await user.comparePassword(password))) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
      /*
       * Lock the door *and* drop every live session. If the password has been
       * guessed on an earlier attempt, a refresh token issued then would
       * otherwise outlive the lockout entirely.
       */
      user.refreshTokens = [];
    }

    await user.save();
    throw ApiError.unauthorized('Incorrect email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Please contact us.');
  }

  // A success clears the counter — the threshold is consecutive failures, not
  // failures ever, or a long-lived account would eventually lock itself.
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
  }

  return user;
}

/** Issue a token pair and remember the refresh token's hash. */
export async function issueTokens(user: UserDocument): Promise<AuthTokens> {
  const tokens = user.generateTokens();
  user.refreshTokens.push(hashToken(tokens.refreshToken));
  user.lastLogin = new Date();
  await user.save();
  return tokens;
}

/**
 * Rotate a refresh token.
 *
 * A syntactically valid token whose hash is *not* on file means it was already
 * rotated — i.e. stolen and replayed. In that case every session is revoked.
 */
export async function rotateRefreshToken(
  userId: string,
  presentedToken: string,
): Promise<{ user: UserDocument; tokens: AuthTokens }> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user || !user.isActive) throw ApiError.unauthorized('Session is no longer valid');

  const presentedHash = hashToken(presentedToken);
  const index = user.refreshTokens.indexOf(presentedHash);

  if (index === -1) {
    user.refreshTokens = [];
    await user.save();
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }

  user.refreshTokens.splice(index, 1);
  const tokens = user.generateTokens();
  user.refreshTokens.push(hashToken(tokens.refreshToken));
  await user.save();

  return { user, tokens };
}

/** Drop one refresh token (single-device logout). */
export async function revokeRefreshToken(userId: string, presentedToken: string): Promise<void> {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  const hashed = hashToken(presentedToken);
  user.refreshTokens = user.refreshTokens.filter((token) => token !== hashed);
  await user.save();
}

/** Drop every refresh token (used after a password change). */
export async function revokeAllSessions(user: UserDocument): Promise<void> {
  user.refreshTokens = [];
  await user.save();
}

/** Create and persist a password-reset token; returns the raw value. */
export async function createPasswordResetToken(user: UserDocument): Promise<string> {
  const { raw, hashed } = createOneTimeToken();
  user.resetPasswordToken = hashed;
  user.resetPasswordExpiry = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();
  return raw;
}

/** Look up an unexpired reset token by its raw value. */
export async function findByResetToken(rawToken: string): Promise<UserDocument | null> {
  const user = await User.findOne({ resetPasswordToken: hashToken(rawToken) }).select(
    '+passwordHash +refreshTokens +resetPasswordToken +resetPasswordExpiry',
  );

  // Expiry is checked here rather than in the query: the token is 32 random
  // bytes, so the lookup is already unguessable, and this keeps the filter
  // free of operators (and the Mongoose typings honest).
  if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry.getTime() < Date.now()) {
    return null;
  }
  return user;
}
