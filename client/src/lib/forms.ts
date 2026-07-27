import { z } from 'zod';
import { PROVINCES } from '@/types/user.types';

/**
 * Shared form schemas.
 *
 * These mirror the server validators from Phase 3 so the client rejects bad
 * input before a round trip — but the server remains authoritative.
 */

export const emailField = z.string().trim().toLowerCase().email('Enter a valid email address');

/** Pakistani mobile or landline: +92, 0092, leading 0, or bare. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^(?:\+92|0092|92|0)?\d{9,11}$/, 'Enter a valid Pakistani phone number');

export const nameField = z.string().trim().min(2, 'Name is too short').max(120);

export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Must contain a letter')
  .regex(/\d/, 'Must contain a number');

export const addressFields = z.object({
  label: z.string().trim().max(40).default('Delivery'),
  line1: z.string().trim().min(3, 'Address is too short').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(80),
  province: z.enum(PROVINCES, { required_error: 'Select a province' }),
  postalCode: z.string().trim().max(10).optional(),
  isDefault: z.boolean().default(false),
});

export const customerFields = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  companyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

/* --------------------------------- RFQ ----------------------------------- */

export const rfqSchema = z.object({
  customer: customerFields,
  message: z.string().trim().max(2000).optional(),
  requiredBy: z
    .string()
    .optional()
    .refine(
      (value) => !value || new Date(value).getTime() > Date.now(),
      'Required-by date must be in the future',
    ),
});
export type RfqInput = z.infer<typeof rfqSchema>;

/* ------------------------------- Checkout -------------------------------- */

export const checkoutSchema = z
  .object({
    customer: customerFields,
    shippingAddress: addressFields,
    billingAddress: addressFields.optional(),
    sameAsBilling: z.boolean().default(true),
    paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']),
    couponCode: z.string().trim().toUpperCase().max(32).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => data.sameAsBilling || data.billingAddress !== undefined, {
    message: 'A billing address is required when it differs from shipping',
    path: ['billingAddress'],
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* --------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  password: passwordField,
  companyName: z.string().trim().max(160).optional(),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const profileSchema = z.object({
  name: nameField,
  phone: phoneField,
  companyName: z.string().trim().max(160).optional(),
  ntn: z
    .string()
    .trim()
    .regex(/^\d{7}-?\d$|^\d{13}$/, 'Enter a valid NTN or CNIC')
    .optional()
    .or(z.literal('')),
});

/* -------------------------------- Contact -------------------------------- */

export const contactSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField.optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Subject is too short').max(200),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
  /** Honeypot — must stay empty. */
  website: z.string().max(0).optional(),
});

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^FT-\d{6}-\d{4,}$/, 'Order numbers look like FT-202607-0001'),
  email: emailField,
});
