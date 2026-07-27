import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as address from '../controllers/address.controller';
import * as password from '../controllers/password.controller';
import { authLimiter, passwordResetLimiter, protect, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  changePasswordSchema,
  createAddressSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenParamSchema,
  updateAddressSchema,
  updateProfileSchema,
} from '../validators';

const router: Router = Router();

/* ---------------------------- Public / limited --------------------------- */
// 5 attempts per IP per 15 minutes on everything credential-related.

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(auth.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(auth.login));
router.post('/refresh', asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(password.forgotPassword),
);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate({ params: tokenParamSchema, body: resetPasswordSchema }),
  asyncHandler(password.resetPassword),
);
router.post(
  '/verify-email/:token',
  validate({ params: tokenParamSchema }),
  asyncHandler(password.verifyEmailAddress),
);

/* -------------------------------- Private -------------------------------- */

router.use(protect);

router.get('/me', asyncHandler(auth.getMe));
router.patch('/me', validate({ body: updateProfileSchema }), asyncHandler(auth.updateMe));
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(auth.updatePassword),
);
router.post('/me/resend-verification', passwordResetLimiter, asyncHandler(password.resendVerification));

/* ----------------------------- Address book ------------------------------ */

router.get('/me/addresses', asyncHandler(address.listAddresses));
router.post(
  '/me/addresses',
  validate({ body: createAddressSchema }),
  asyncHandler(address.addAddress),
);
router.patch(
  '/me/addresses/:index',
  validate({ body: updateAddressSchema }),
  asyncHandler(address.updateAddress),
);
router.delete('/me/addresses/:index', asyncHandler(address.deleteAddress));

export default router;
