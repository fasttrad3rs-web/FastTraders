import type { Request, Response } from 'express';
import type { UserRole } from '../types';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { REFRESH_TOKEN_COOKIE } from '../middleware/auth';
import { User } from '../models';
import { email } from '../services/email';
import * as authService from '../services/auth.service';
import { recordAudit } from '../services/audit.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies';
import type { ChangePasswordInput, LoginInput } from '../validators';

/**
 * Staff authentication.
 *
 * There is no registration, no profile editing and no self-service reset —
 * every account is minted by an admin through `POST /admin/users`.
 */

/** The only roles allowed to hold a session. */
const STAFF_ROLES: readonly UserRole[] = ['admin', 'manager'];

/** Read the refresh token from its httpOnly cookie, falling back to the body. */
function extractRefreshToken(req: Request): string {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[REFRESH_TOKEN_COOKIE];
  const body = req.body as { refreshToken?: string } | undefined;
  const token = fromCookie ?? body?.refreshToken;

  if (!token) throw ApiError.unauthorized('No refresh token provided');
  return token;
}

function verifyRefreshToken(token: string): string {
  const decoded: unknown = jwt.verify(token, env.JWT_REFRESH_SECRET);
  const payload = decoded as { sub?: unknown; tokenType?: unknown };

  if (typeof payload.sub !== 'string' || payload.tokenType !== 'refresh') {
    throw ApiError.unauthorized('Malformed refresh token');
  }
  return payload.sub;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email: address, password } = req.body as LoginInput;

  const user = await authService.authenticate(address, password);

  /*
   * Post-verification role check. The `role` enum no longer admits
   * `customer`, so this should be unreachable — which is exactly why it is
   * here: a row left behind by the old schema would still authenticate, and
   * the failure mode would be a stranger holding a valid staff cookie.
   * The message is deliberately the same one a wrong password gets.
   */
  if (!STAFF_ROLES.includes(user.role)) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);

  recordAudit({ req, action: 'login', entity: 'User', entityId: user._id.toString() });

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Signed in successfully',
  );
}

/* -------------------------------- Refresh -------------------------------- */

export async function refresh(req: Request, res: Response): Promise<void> {
  const presented = extractRefreshToken(req);
  const userId = verifyRefreshToken(presented);

  const { user, tokens } = await authService.rotateRefreshToken(userId, presented);
  setAuthCookies(res, tokens);

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Session refreshed',
  );
}

/* --------------------------------- Logout -------------------------------- */

export async function logout(req: Request, res: Response): Promise<void> {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const presented = cookies?.[REFRESH_TOKEN_COOKIE];

  if (presented) {
    try {
      const userId = verifyRefreshToken(presented);
      await authService.revokeRefreshToken(userId, presented);
    } catch {
      // An expired or forged token still results in a clean logout.
    }
  }

  clearAuthCookies(res);
  sendSuccess(res, null, 'Signed out');
}

/* ------------------------- Current user (staff) --------------------------- */

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');

  sendSuccess(res, authService.toPublicUser(user), 'Current user');
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await User.findById(req.user?.id).select('+passwordHash +refreshTokens');
  if (!user) throw ApiError.notFound('Account not found');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Your current password is incorrect');
  }

  user.passwordHash = newPassword;
  // Changing a password signs out every other device.
  user.refreshTokens = [];
  await user.save();

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  email.passwordChanged(user.email, user.name);
  recordAudit({ req, action: 'update', entity: 'User', entityId: user._id.toString() });

  sendSuccess(res, { accessToken: tokens.accessToken }, 'Password changed. Other devices signed out.');
}
