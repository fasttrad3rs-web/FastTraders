import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authLimiter, protect, restrictTo, validate } from '../middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { changePasswordSchema, loginSchema } from '../validators';

/**
 * Staff authentication. Four routes, and that is the whole surface.
 *
 * Gone with the customer account: register, forgot-password, reset-password,
 * verify-email, profile editing and the address book. Accounts are minted by
 * an admin at `POST /admin/users`.
 */
const router: Router = Router();

/* ---------------------------- Public / limited --------------------------- */
// 5 attempts per IP per 15 minutes. `login` additionally rejects any account
// whose role is not admin or manager, after the password check.

router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(auth.login));
router.post('/refresh', asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));

/* -------------------------------- Private -------------------------------- */

router.use(protect, restrictTo('admin', 'manager'));

router.get('/me', asyncHandler(auth.getMe));
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(auth.updatePassword),
);

export default router;
