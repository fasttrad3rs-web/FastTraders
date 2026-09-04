import { z } from 'zod';

/**
 * Shared form schemas.
 *
 * These mirror the server validators so the client rejects bad input before a
 * round trip — but the server remains authoritative.
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

export const customerFields = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  companyName: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
});

/* ------------------------------- Inquiry --------------------------------- */

/**
 * Optional email. An empty input is "not given", not "invalid".
 *
 * Phone is the required channel here and email is not, which is the reverse
 * of most forms and entirely deliberate: a panel builder in Bull Road has a
 * mobile he answers, and the email address he gives you is often his
 * nephew's. Making email a condition of enquiring costs real leads.
 */
const optionalEmailField = z
  .union([z.literal(''), emailField])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalPhoneField = z
  .union([z.literal(''), phoneField])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const inquiryCustomerFields = z.object({
  name: nameField,
  phone: phoneField,
  whatsapp: optionalPhoneField,
  email: optionalEmailField,
  company: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  designation: z.string().trim().max(120).optional(),
});

export const submitInquirySchema = z.object({
  customer: inquiryCustomerFields,
  message: z.string().trim().max(4000).optional(),
  preferredContactMethod: z.enum(['phone', 'whatsapp', 'email']).default('phone'),
  preferredContactTime: z.string().trim().max(120).optional(),
  /**
   * The honeypot. Hidden from humans by CSS; a bot that fills every input
   * fills this one. The server discards the submission with a cheerful 201
   * rather than telling the author which field caught them.
   */
  website: z.string().max(0).optional(),
});
export type SubmitInquiryFormValues = z.infer<typeof submitInquirySchema>;

/**
 * The sourcing request.
 *
 * Mirrors `sourcingInquirySchema` on the server. Distinct from an inquiry in
 * one way that matters: there is no shortlist behind it, because the whole
 * point is that we do not stock the thing yet. `itemDescription` therefore
 * carries the weight that product ids carry elsewhere, and it is the only
 * required field besides name and phone.
 */
export const sourcingRequestSchema = z.object({
  customer: inquiryCustomerFields,
  message: z.string().trim().max(4000).optional(),
  preferredContactMethod: z.enum(['phone', 'whatsapp', 'email']).default('phone'),
  preferredContactTime: z.string().trim().max(120).optional(),
  sourcingDetails: z.object({
    itemDescription: z
      .string()
      .trim()
      .min(5, 'Tell us what you are looking for')
      .max(2000),
    preferredBrand: z.string().trim().max(120).optional(),
    partNumber: z.string().trim().max(120).optional(),
    specifications: z.string().trim().max(4000).optional(),
    quantity: z.coerce.number().int().positive('How many do you need?').max(1_000_000),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
    /*
     * Two values, not three. "Standard" and "urgent" is the distinction the
     * shop can actually act on — a third middle option just makes everyone
     * pick the middle.
     */
    urgency: z.enum(['standard', 'urgent']).default('standard'),
    isRepeatRequirement: z.boolean().default(false),
    /** ISO date from the picker; the server coerces it to a Date. */
    requiredBy: z.string().trim().optional(),
    application: z.string().trim().max(1000).optional(),
  }),
  website: z.string().max(0).optional(),
});
export type SourcingRequestFormValues = z.infer<typeof sourcingRequestSchema>;

/* --------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/*
 * No registration schema. There is no public sign-up — the only accounts are
 * staff ones, created by an admin through the API.
 */

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
