/**
 * Domain types shared across the client.
 *
 * MIRRORED DIRECTORY — keep in sync with `server/src/types/`.
 * These describe the serialised API shape: ids are strings and dates are ISO
 * strings. Server-only fields (`passwordHash`, `internalCost`,
 * `lastQuotedPrice`, `supplierNotes`, `stock`, refresh tokens) are absent —
 * `toPublicJSON()` on the server strips them before they are serialised.
 */

import type { UserRole } from './user.types';

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated, HttpMethod } from './api';

export type { UserRole, User, AuthTokens } from './user.types';

export type {
  Seo,
  Category,
  Brand,
  Availability,
  ProductUnit,
  ProductImage,
  Specification,
  ProductVariant,
  Datasheet,
  Product,
} from './catalog.types';

/**
 * Commerce types (Order, Cart, Coupon, payment) and every customer-account
 * type went with the catalogue-only pivot. The Quotation became the Inquiry.
 */
export type {
  InquiryType,
  InquiryStatus,
  InquiryPriority,
  InquirySource,
  ContactMethod,
  Urgency,
  InquiryCustomer,
  InquiryItem,
  ReferenceFile,
  SourcingDetails,
  FollowUp,
  Inquiry,
} from './inquiry.types';

export type {
  Testimonial,
  ContactStatus,
  ContactSource,
  Contact,
  NewsletterSubscriber,
  BannerPosition,
  Banner,
  BusinessHours,
  SocialLinks,
  Setting,
  AuditAction,
  AuditLog,
} from './content.types';

/** Supported locales — English now, Urdu planned. */
export type Locale = 'en' | 'ur';

/** Minimal identity attached to the authenticated session. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
