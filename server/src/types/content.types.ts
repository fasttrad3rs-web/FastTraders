/**
 * Content & operations types: Review, Contact, Newsletter, Banner, Setting, AuditLog.
 * MIRRORED FILE — keep in sync with `client/src/types/content.types.ts`
 * (the client mirror omits AuditLog, which is admin-internal).
 */

/* -------------------------------- Review -------------------------------- */

export interface Review {
  id: string;
  product: string;
  user: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment: string;
  images: string[];
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------- Contact ------------------------------- */

export type ContactStatus = 'new' | 'read' | 'responded';

/** Where the enquiry came from — useful for attribution. */
export type ContactSource = 'contact_form' | 'product_page' | 'whatsapp' | 'phone' | 'footer';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: ContactSource;
  status: ContactStatus;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ Newsletter ------------------------------ */

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
}

/* -------------------------------- Banner -------------------------------- */

export type BannerPosition = 'hero' | 'strip' | 'sidebar';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  /** Portrait crop served to phones — Pakistan traffic is mobile-heavy. */
  mobileImage?: string;
  link?: string;
  ctaText?: string;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------- Setting ------------------------------- */

export interface BusinessHours {
  /** e.g. "Mon – Sat". */
  days: string;
  open: string;
  close: string;
  note?: string;
}

export interface ShippingRule {
  label: string;
  /** Matches against the shipping address city; `*` is the fallback rule. */
  city: string;
  cost: number;
  /** Order subtotal above which shipping is waived. */
  freeAbove?: number;
  etaDays: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;
}

export interface Setting {
  id: string;
  /** Enforced singleton key. Always `global`. */
  key: 'global';
  storeName: string;
  tagline: string;
  logo?: string;
  email: string;
  phone: string;
  landline?: string;
  whatsapp?: string;
  address: string;
  mapEmbedUrl?: string;
  social: SocialLinks;
  businessHours: BusinessHours[];
  shippingRules: ShippingRule[];
  /** Default sales-tax rate as a percentage, e.g. 18 for 18% GST. */
  defaultTaxRate: number;
  currency: 'PKR';
  announcement: {
    text?: string;
    link?: string;
    isActive: boolean;
  };
  bankDetails?: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban?: string;
  };
  updatedAt: string;
}

/* ------------------------------- AuditLog ------------------------------- */

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'status_change';

export interface AuditLog {
  id: string;
  actor: string | null;
  action: AuditAction;
  /** Model name, e.g. "Product". */
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  at: string;
}
