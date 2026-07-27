import type { Request, Response } from 'express';
import { User } from '../models';
import * as authService from '../services/auth.service';
import { email } from '../services/email';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/ApiResponse';
import { setAuthCookies } from '../utils/cookies';

/** Password reset and email verification — the token-driven auth flows. */

/**
 * Always answers 200 with the same message, whether or not the address exists.
 * Anything else turns this endpoint into an account-enumeration oracle.
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email: address } = req.body as { email: string };
  const genericMessage = 'If that email is registered, a reset link is on its way.';

  const user = await User.findOne({ email: address }).select(
    '+resetPasswordToken +resetPasswordExpiry',
  );

  if (user?.isActive) {
    const token = await authService.createPasswordResetToken(user);
    email.resetPassword(user.email, user.name, token);
  }

  sendSuccess(res, null, genericMessage);
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token } = req.params as { token: string };
  const { password } = req.body as { password: string };

  const user = await authService.findByResetToken(token);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');

  user.passwordHash = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  // A reset invalidates every existing session.
  user.refreshTokens = [];
  await user.save();

  const tokens = await authService.issueTokens(user);
  setAuthCookies(res, tokens);
  email.passwordChanged(user.email, user.name);

  sendSuccess(
    res,
    { user: authService.toPublicUser(user), accessToken: tokens.accessToken },
    'Password reset. You are now signed in.',
  );
}

export async function verifyEmailAddress(req: Request, res: Response): Promise<void> {
  const { token } = req.params as { token: string };

  const user = await authService.findByVerifyToken(token);
  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpiry = undefined;
  await user.save();

  sendSuccess(res, { isEmailVerified: true }, 'Email address verified');
}

/** Re-send a verification link to the signed-in user. */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user?.id).select('+emailVerifyToken +emailVerifyExpiry');
  if (!user) throw ApiError.notFound('Account not found');

  if (user.isEmailVerified) {
    sendSuccess(res, null, 'This address is already verified');
    return;
  }

  const token = await authService.createEmailVerifyToken(user);
  email.verifyAddress(user.email, user.name, token);

  sendSuccess(res, null, 'Verification email sent');
}
