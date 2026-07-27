import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { REFRESH_TOKEN_COOKIE } from '../middleware/auth';
import { User } from '../models';
import { email } from '../services/email';
import * as authService from '../services/auth.service';
import { mergeGuestCarts } from '../services/cart.service';
import { recordAudit } from '../services/audit.service';
import { readSessionId } from '../services/session.service';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import { clearAuthCookies, clearSessionCookie, setAuthCookies } from '../utils/cookies';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators';

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

/* ------------------------------- Register -------------------------------- */

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;

  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.password,
    ...(input.companyName ? { companyName: input.companyName } : {}),
  });

  const verifyToken = await authService.createEmailVerifyToken(user);
  email.welcome(user.email, user.name);
  email.verifyAddress(user.email, user.name, verifyToken);

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  await mergeGuestCarts(readSessionId(req), user._id.toString());
  clearSessionCookie(res);

  sendCreated(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Account created. Please check your email to verify your address.',
  );
}

/* --------------------------------- Login --------------------------------- */

export async function login(req: Request, res: Response): Promise<void> {
  const { email: address, password } = req.body as LoginInput;

  const user = await authService.authenticate(address, password);
  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);

  // Carry an anonymous cart into the account, then retire the guest cookie.
  await mergeGuestCarts(readSessionId(req), user._id.toString());
  clearSessionCookie(res);

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

/* ---------------------------------- Me ----------------------------------- */

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');

  sendSuccess(res, authService.toPublicUser(user), 'Current user');
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateProfileInput;

  const user = await User.findById(req.user?.id);
  if (!user) throw ApiError.notFound('Account not found');

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  if (input.companyName !== undefined) user.companyName = input.companyName ?? undefined;
  if (input.ntn !== undefined) user.ntn = input.ntn ?? undefined;

  await user.save();
  sendSuccess(res, authService.toPublicUser(user), 'Profile updated');
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
