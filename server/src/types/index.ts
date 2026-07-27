/**
 * Domain types shared across the server.
 *
 * MIRRORED DIRECTORY — keep in sync with `client/src/types/`.
 * Entity interfaces describe the *serialised API shape* (ids as strings, dates
 * as ISO strings). Mongoose document interfaces live beside their schemas in
 * `src/models/` and may carry server-only fields such as `passwordHash` and
 * `costPrice`.
 */

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated } from './api';

import type { UserRole } from './user.types';

export type { UserRole, Province, Address, User, AuthTokens } from './user.types';
export { PROVINCES } from './user.types';

export type {
  Seo,
  Category,
  Brand,
  PricingMode,
  StockStatus,
  ProductUnit,
  ProductImage,
  Specification,
  ProductVariant,
  Datasheet,
  Product,
} from './catalog.types';

export type {
  CustomerDetails,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderItem,
  PaymentDetails,
  StatusHistoryEntry,
  Order,
  QuotationStatus,
  QuotationItem,
  Attachment,
  Quotation,
  CartType,
  CartItem,
  Cart,
  CouponType,
  Coupon,
} from './commerce.types';

export type {
  Review,
  ContactStatus,
  ContactSource,
  Contact,
  NewsletterSubscriber,
  BannerPosition,
  Banner,
  BusinessHours,
  ShippingRule,
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
