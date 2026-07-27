/**
 * Domain types shared across the client.
 *
 * MIRRORED DIRECTORY — keep in sync with `server/src/types/`.
 * These describe the serialised API shape: ids are strings and dates are ISO
 * strings. Server-only fields (`passwordHash`, `costPrice`, refresh tokens)
 * are deliberately absent.
 */

import type { UserRole } from './user.types';

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated, HttpMethod } from './api';

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

/** Minimal identity attached to the authenticated session. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
