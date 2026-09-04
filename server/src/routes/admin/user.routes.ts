import { Router } from 'express';
import * as users from '../../controllers/admin/user.controller';
import { restrictTo, validate } from '../../middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  adminUserQuerySchema,
  createStaffSchema,
  idParamSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../../validators';

const router: Router = Router();

router.get('/', validate({ query: adminUserQuerySchema }), asyncHandler(users.listUsers));

/** The only route that can mint an account, now that registration is closed. */
router.post(
  '/',
  restrictTo('admin'),
  validate({ body: createStaffSchema }),
  asyncHandler(users.createStaff),
);
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(users.getUser));

/** Privilege changes are admin-only — a manager cannot promote anyone. */
router.patch(
  '/:id/role',
  restrictTo('admin'),
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  asyncHandler(users.updateRole),
);

router.patch(
  '/:id/status',
  restrictTo('admin'),
  validate({ params: idParamSchema, body: updateUserStatusSchema }),
  asyncHandler(users.updateStatus),
);

export default router;
