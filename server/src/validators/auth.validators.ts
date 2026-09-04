import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.validators';

/**
 * Staff authentication only.
 *
 * Registration, profile editing and address schemas went with the customer
 * account. Staff accounts are created by an admin through `POST /admin/users`,
 * which validates with `createStaffSchema`.
 */

export const loginSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema` — an existing account may predate the rules, and
  // echoing complexity requirements on login leaks policy to attackers.
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    { message: 'New password must differ from the current one', path: ['newPassword'] },
  );
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
