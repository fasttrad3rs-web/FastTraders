import { z } from 'zod';
import {
  addressSchema,
  emailSchema,
  nameSchema,
  ntnSchema,
  passwordSchema,
  phoneSchema,
} from './common.validators';

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  companyName: z.string().trim().max(160).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema` — an existing account may predate the rules, and
  // echoing complexity requirements on login leaks policy to attackers.
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    companyName: z.string().trim().max(160).nullable().optional(),
    ntn: ntnSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({ password: passwordSchema });

export const createAddressSchema = addressSchema;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = addressSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Provide at least one field to update',
);
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
