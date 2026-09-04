import { z } from 'zod';
import {
  booleanQuerySchema,
  emailSchema,
  objectIdSchema,
  paginationSchema,
  phoneSchema,
} from './common.validators';

/** Admin staff, content and reporting payloads. Inquiry payloads live in
 *  `inquiry.validators.ts`. */

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/* ------------------------------- Customers ------------------------------- */

/**
 * Staff account creation.
 *
 * `role` deliberately has no `customer` option: with registration closed,
 * every account this endpoint makes is someone who works here.
 */
export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8, 'Use at least 8 characters').max(128),
  role: z.enum(['admin', 'manager']).default('manager'),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const adminUserQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(['customer', 'admin', 'manager']).optional(),
  isActive: booleanQuerySchema.optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'last_login']).default('newest'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['customer', 'admin', 'manager']),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

/* -------------------------------- Content -------------------------------- */

export const contactQuerySchema = paginationSchema.extend({
  status: z.enum(['new', 'read', 'responded']).optional(),
  search: z.string().trim().max(120).optional(),
});

export const updateContactSchema = z.object({
  status: z.enum(['new', 'read', 'responded']),
});

export const newsletterQuerySchema = paginationSchema.extend({
  isActive: booleanQuerySchema.optional(),
});

export const auditQuerySchema = paginationSchema
  .extend({
    entity: z.string().trim().max(60).optional(),
    entityId: z.string().trim().max(60).optional(),
    actor: objectIdSchema.optional(),
    action: z
      .enum(['create', 'update', 'delete', 'login', 'logout', 'status_change'])
      .optional(),
  })
  .merge(dateRangeSchema);

export const updateSettingsSchema = z
  .object({
    /*
     * Optional fields are `nullable` as well as `optional`, and the difference
     * is the whole point: optional-but-not-nullable means a value can be set
     * and never removed. The admin screen omitted blank boxes, so clearing the
     * landline sent a PATCH that never mentioned it, the old number survived,
     * and the toast still said "Settings saved".
     *
     * `null` is the only way to say "remove this". An empty string cannot be —
     * it fails `.url()`, and for a phone number it would be a lie.
     */
    storeName: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).nullable().optional(),
    logo: z.string().url().nullable().optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    landline: z.string().trim().max(24).nullable().optional(),
    whatsapp: z.string().trim().max(24).nullable().optional(),
    address: z.string().trim().max(300).optional(),
    mapEmbedUrl: z.string().url().nullable().optional(),
    social: z
      .object({
        facebook: z.string().url().nullable().optional(),
        instagram: z.string().url().nullable().optional(),
        linkedin: z.string().url().nullable().optional(),
        youtube: z.string().url().nullable().optional(),
        whatsapp: z.string().url().nullable().optional(),
      })
      .optional(),
    businessHours: z
      .array(
        z.object({
          days: z.string().trim().min(1).max(60),
          open: z.string().trim().max(20),
          close: z.string().trim().max(20),
          note: z.string().trim().max(120).optional(),
        }),
      )
      .max(10)
      .optional(),
    announcement: z
      .object({
        text: z.string().trim().max(200).nullable().optional(),
        link: z.string().trim().max(300).nullable().optional(),
        isActive: z.boolean().default(false),
      })
      .optional(),
    /*
     * Nullable as a whole object, not just field by field. These are the
     * account details printed on quotations — when Fast Traders changes bank,
     * "remove the old one" has to be expressible, or a stale account number
     * keeps going out to customers.
     */
    bankDetails: z
      .object({
        bankName: z.string().trim().min(2).max(120),
        accountTitle: z.string().trim().min(2).max(120),
        accountNumber: z.string().trim().min(4).max(40),
        iban: z.string().trim().max(40).nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/* -------------------------------- Reports -------------------------------- */

export const dashboardChartQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  days: z.coerce.number().int().positive().max(730).default(30),
});

export const reportQuerySchema = dateRangeSchema.extend({
  /** No 'sales' — nothing is sold through the site. */
  type: z.enum(['inquiries', 'inventory', 'customer']),
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
