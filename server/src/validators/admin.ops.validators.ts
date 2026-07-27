import { z } from 'zod';
import {
  booleanQuerySchema,
  emailSchema,
  objectIdSchema,
  paginationSchema,
  phoneSchema,
} from './common.validators';

/** Admin order, quotation, customer, content and reporting payloads. */

const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/* --------------------------------- Orders -------------------------------- */

export const adminOrderQuerySchema = paginationSchema
  .extend({
    search: z.string().trim().max(120).optional(),
    status: z
      .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
      .optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']).optional(),
    sort: z.enum(['newest', 'oldest', 'total_desc', 'total_asc']).default('newest'),
  })
  .merge(dateRangeSchema)
  .refine((query) => !query.from || !query.to || query.to >= query.from, {
    message: '`to` must not be earlier than `from`',
    path: ['to'],
  });
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ]),
  note: z.string().trim().max(500).optional(),
  /** Suppress the customer email for silent corrections. */
  notifyCustomer: z.boolean().default(true),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  transactionId: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(60).optional(),
  receiptUrl: z.string().url().optional(),
  note: z.string().trim().max(500).optional(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const updateTrackingSchema = z
  .object({
    trackingNumber: z.string().trim().max(120).optional(),
    courier: z.string().trim().max(80).optional(),
    /** Move the order to `shipped` at the same time. */
    markShipped: z.boolean().default(false),
  })
  .refine(
    (data) => data.trackingNumber !== undefined || data.courier !== undefined,
    'Provide a tracking number or a courier',
  );
export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;

/* ------------------------------- Quotations ------------------------------ */

export const adminQuotationQuerySchema = paginationSchema
  .extend({
    search: z.string().trim().max(120).optional(),
    status: z
      .enum(['new', 'reviewing', 'quoted', 'negotiating', 'accepted', 'rejected', 'expired', 'converted'])
      .optional(),
    assignedTo: objectIdSchema.optional(),
    unassigned: booleanQuerySchema.optional(),
    sort: z.enum(['newest', 'oldest', 'required_by']).default('newest'),
  })
  .merge(dateRangeSchema);
export type AdminQuotationQuery = z.infer<typeof adminQuotationQuerySchema>;

/** Price the RFQ. Items are matched on SKU so the array order cannot corrupt data. */
export const priceQuotationSchema = z
  .object({
    items: z
      .array(
        z.object({
          sku: z.string().trim().min(1).max(60),
          quotedUnitPrice: z.number().nonnegative(),
          qty: z.number().int().positive().optional(),
        }),
      )
      .min(1),
    quotedTax: z.number().nonnegative().optional(),
    validUntil: z.coerce.date().optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    status: z.enum(['reviewing', 'quoted', 'negotiating', 'rejected', 'expired']).optional(),
  })
  .refine(
    (data) => !data.validUntil || data.validUntil.getTime() > Date.now(),
    { message: 'validUntil must be in the future', path: ['validUntil'] },
  );
export type PriceQuotationInput = z.infer<typeof priceQuotationSchema>;

export const assignQuotationSchema = z.object({
  assignedTo: objectIdSchema.nullable(),
});

export const convertQuotationSchema = z.object({
  paymentMethod: z.enum(['cod', 'bank_transfer', 'stripe', 'jazzcash', 'easypaisa']).default('bank_transfer'),
  shippingAddress: z
    .object({
      label: z.string().trim().max(40).default('Delivery'),
      line1: z.string().trim().min(3).max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2).max(80),
      province: z.string().trim().min(2).max(60),
      postalCode: z.string().trim().max(10).optional(),
      isDefault: z.boolean().default(false),
    })
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ConvertQuotationInput = z.infer<typeof convertQuotationSchema>;

/* ------------------------------- Customers ------------------------------- */

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
    storeName: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).optional(),
    logo: z.string().url().optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    landline: z.string().trim().max(24).optional(),
    whatsapp: z.string().trim().max(24).optional(),
    address: z.string().trim().max(300).optional(),
    mapEmbedUrl: z.string().url().optional(),
    social: z
      .object({
        facebook: z.string().url().optional(),
        instagram: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        youtube: z.string().url().optional(),
        whatsapp: z.string().url().optional(),
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
    shippingRules: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          city: z.string().trim().min(1).max(80),
          cost: z.number().nonnegative(),
          freeAbove: z.number().nonnegative().optional(),
          etaDays: z.string().trim().min(1).max(60),
        }),
      )
      .max(30)
      .optional(),
    defaultTaxRate: z.number().min(0).max(100).optional(),
    announcement: z
      .object({
        text: z.string().trim().max(200).optional(),
        link: z.string().trim().max(300).optional(),
        isActive: z.boolean().default(false),
      })
      .optional(),
    bankDetails: z
      .object({
        bankName: z.string().trim().min(2).max(120),
        accountTitle: z.string().trim().min(2).max(120),
        accountNumber: z.string().trim().min(4).max(40),
        iban: z.string().trim().max(40).optional(),
      })
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
  type: z.enum(['sales', 'inventory', 'customer']),
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
