/**
 * Domain types shared across the server.
 *
 * MIRRORED DIRECTORY — keep in sync with `client/src/types/`.
 * Entity interfaces describe the *serialised API shape* (ids as strings, dates
 * as ISO strings). Mongoose document interfaces live beside their schemas in
 * `src/models/` and may carry server-only fields such as `passwordHash` and
 * internal pricing fields.
 */

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated } from './api';

import type { UserRole } from './user.types';

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
 * Commerce types (Order, Cart, Coupon, payment) were removed when the business
 * moved to a catalogue-only model, along with every customer-account type
 * (Address, Province). The Quotation became the Inquiry.
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

/** Minimal identity attached to an authenticated request. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
