import { z } from 'zod';
import { objectIdSchema, paginationSchema } from './common.validators';
import { normalisePakistaniPhone } from '../utils/phone';

/**
 * Inquiry payloads.
 *
 * Phone is required and email is not — the reverse of most forms, and
 * deliberate. A panel builder in Bull Road has a mobile he answers; the email
 * address he gives you is often his nephew's, checked twice a month. Asking
 * for an email as a condition of enquiring costs real leads.
 */

/**
 * Any Pakistani format in, `+92XXXXXXXXXX` out.
 *
 * The transform runs on the way in, so everything downstream — storage,
 * search, WhatsApp links, duplicate detection — sees one shape.
 */
export const pakistaniPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((value, ctx) => {
    const normalised = normalisePakistaniPhone(value);
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a Pakistani number, e.g. 0300 1234567 or 042 37378460',
      });
      return z.NEVER;
    }
    return normalised;
  });

/** Same rules, but an empty string means "not given" rather than "invalid". */
export const optionalPakistaniPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const normalised = normalisePakistaniPhone(value);
    if (!normalised) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid Pakistani number' });
      return z.NEVER;
    }
    return normalised;
  });

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(160)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const inquiryCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  phone: pakistaniPhoneSchema,
  whatsapp: optionalPakistaniPhoneSchema,
  email: optionalEmail,
  company: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  designation: z.string().trim().max(120).optional(),
});

const contactPrefs = {
  preferredContactMethod: z.enum(['phone', 'whatsapp', 'email']).default('phone'),
  preferredContactTime: z.string().trim().max(120).optional(),
};

/**
 * The honeypot.
 *
 * The form renders a `website` field hidden from humans by CSS. A person
 * never fills it; a naive bot fills everything it finds. Anything non-empty
 * is dropped. It is not a serious defence on its own — it is free, silent,
 * and catches the bulk of drive-by spam without a captcha in front of a
 * customer trying to buy a breaker.
 */
export const honeypotSchema = z
  .string()
  .max(0, 'Submission rejected')
  .optional()
  .or(z.literal('').optional());

/* ---------------------------- Product inquiry ---------------------------- */

/**
 * A line the client believes is on the shortlist.
 *
 * Only `product` and `qty` are trusted — name, SKU and brand are re-read from
 * the database when the inquiry is built, so a tampered body cannot put
 * "Terasaki ACB" against a WAGO connector's id.
 */
export const inquiryItemInputSchema = z.object({
  product: objectIdSchema,
  qty: z.coerce.number().int().positive().max(100_000).default(1),
  note: z.string().trim().max(500).optional(),
});

export const createInquirySchema = z.object({
  customer: inquiryCustomerSchema,
  /**
   * The client's own shortlist. Optional: an older bundle, or a submission
   * from a page that never loaded the store, still falls back to the
   * server-side session list.
   */
  items: z.array(inquiryItemInputSchema).max(100).optional(),
  message: z.string().trim().max(4000).optional(),
  ...contactPrefs,
  website: honeypotSchema,
});
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

/* --------------------------- Sourcing request ---------------------------- */

export const sourcingInquirySchema = z.object({
  customer: inquiryCustomerSchema,
  message: z.string().trim().max(4000).optional(),
  ...contactPrefs,
  website: honeypotSchema,
  sourcingDetails: z.object({
    itemDescription: z.string().trim().min(5, 'Describe what you need').max(2000),
    preferredBrand: z.string().trim().max(120).optional(),
    partNumber: z.string().trim().max(120).optional(),
    specifications: z.string().trim().max(4000).optional(),
    quantity: z.coerce.number().int().positive().max(1_000_000).optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
    targetDate: z.coerce.date().optional(),
    urgency: z.enum(['standard', 'urgent']).default('standard'),
    isRepeatRequirement: z.coerce.boolean().optional(),
    application: z.string().trim().max(1000).optional(),
  }),
});
export type SourcingInquiryInput = z.infer<typeof sourcingInquirySchema>;

/* ----------------------------- Inquiry list ------------------------------ */

export const addListItemSchema = z.object({
  product: objectIdSchema,
  qty: z.coerce.number().int().positive().max(100_000).default(1),
  note: z.string().trim().max(500).optional(),
});
export type AddListItemInput = z.infer<typeof addListItemSchema>;

export const updateListItemSchema = z
  .object({
    product: objectIdSchema,
    qty: z.coerce.number().int().positive().max(100_000).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => data.qty !== undefined || data.note !== undefined,
    'Provide a quantity or a note to update',
  );
export type UpdateListItemInput = z.infer<typeof updateListItemSchema>;

export const listItemParamSchema = z.object({ productId: objectIdSchema });

/* -------------------------------- Admin ---------------------------------- */

const dateRange = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const adminInquiryQuerySchema = paginationSchema
  .extend({
    type: z.enum(['product_inquiry', 'sourcing_request', 'general']).optional(),
    status: z
      .enum(['new', 'contacted', 'quoted_verbally', 'negotiating', 'won', 'lost', 'no_response'])
      .optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    assignedTo: objectIdSchema.optional(),
    city: z.string().trim().max(80).optional(),
    source: z.enum(['website', 'whatsapp', 'phone', 'walk_in']).optional(),
    /** Matches name, phone, company or inquiry number. */
    search: z.string().trim().max(120).optional(),
    sort: z.enum(['newest', 'oldest', 'priority']).default('newest'),
    ...dateRange,
  })
  .refine((query) => !query.from || !query.to || query.to >= query.from, {
    message: '`to` must not be earlier than `from`',
    path: ['to'],
  });
export type AdminInquiryQuery = z.infer<typeof adminInquiryQuerySchema>;

/**
 * Bulk update over selected inquiries.
 *
 * `lost` is not accepted here. The model requires a reason for it, and a
 * reason typed once and applied to twenty different inquiries is not a reason
 * — it is noise that makes the lost-reason report useless. Those get marked
 * one at a time on the detail screen, which is also where somebody is looking
 * at the conversation that ended.
 */
export const bulkInquirySchema = z
  .object({
    ids: z.array(objectIdSchema).min(1, 'Select at least one inquiry').max(200),
    status: z
      .enum(['new', 'contacted', 'quoted_verbally', 'negotiating', 'won', 'no_response'])
      .optional(),
    assignedTo: objectIdSchema.nullable().optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
  })
  .refine(
    (body) =>
      body.status !== undefined || body.assignedTo !== undefined || body.priority !== undefined,
    'Provide a status, assignee or priority to apply',
  );
export type BulkInquiryInput = z.infer<typeof bulkInquirySchema>;

export const updateInquirySchema = z
  .object({
    status: z
      .enum(['new', 'contacted', 'quoted_verbally', 'negotiating', 'won', 'lost', 'no_response'])
      .optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    assignedTo: objectIdSchema.nullable().optional(),
    internalQuotedAmount: z.number().nonnegative().nullable().optional(),
    lostReason: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update')
  .refine((data) => data.status !== 'lost' || Boolean(data.lostReason), {
    message: 'Say why it was lost — an unexplained loss teaches nobody anything',
    path: ['lostReason'],
  });
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;

export const addFollowUpSchema = z.object({
  note: z.string().trim().min(1, 'A follow-up needs a note').max(2000),
  nextFollowUpAt: z.coerce.date().optional(),
});
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;

/**
 * Export filters, kept in step with `adminInquiryQuerySchema`.
 *
 * They must match: the button sits on the list and is understood as "download
 * what I am looking at". Accepting fewer filters here means Zod silently drops
 * the rest and hands back a wider set than the screen showed — which is how
 * somebody mails a supplier the wrong list.
 */
export const inquiryExportQuerySchema = z.object({
  type: z.enum(['product_inquiry', 'sourcing_request', 'general']).optional(),
  status: z
    .enum(['new', 'contacted', 'quoted_verbally', 'negotiating', 'won', 'lost', 'no_response'])
    .optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  assignedTo: objectIdSchema.optional(),
  city: z.string().trim().max(80).optional(),
  source: z.enum(['website', 'whatsapp', 'phone', 'walk_in']).optional(),
  search: z.string().trim().max(120).optional(),
  ...dateRange,
});
export type InquiryExportQuery = z.infer<typeof inquiryExportQuerySchema>;
