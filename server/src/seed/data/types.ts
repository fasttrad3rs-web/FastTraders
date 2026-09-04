import type {
  Availability,
  ContactMethod,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
  InquiryType,
  ProductUnit,
  Specification,
  Urgency,
} from '../../types';

/**
 * Plain seed-data shapes. Categories and brands are referenced by slug and
 * resolved to ObjectIds by the runner, so the data files stay declarative.
 */

export interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  /** Parent slug, or null for a root category. */
  parent: string | null;
  displayOrder: number;
  isFeatured?: boolean;
}

export interface BrandSeed {
  name: string;
  slug: string;
  /** Root-relative path under the client's `public/`. See brands.ts. */
  logo?: string;
  country: string;
  website?: string;
  description: string;
  isFeatured?: boolean;
  displayOrder: number;
}

export interface ProductSeed {
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  brand: string;
  /** Level-1 category slug. */
  category: string;
  /** Level-2 category slug, when the product sits deeper in the tree. */
  subCategory?: string;
  /** Internal only — never published. */
  lastQuotedPrice?: number;
  internalCost?: number;
  /** Defaults to `ready_stock` when there is stock, `available_on_order` otherwise. */
  availability?: Availability;
  leadTime?: string;
  isImportItem?: boolean;
  stock: number;
  unit?: ProductUnit;
  minOrderQty?: number;
  shortDescription: string;
  description: string;
  specifications: Specification[];
  tags: string[];
  warranty?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
}

/**
 * A sample inquiry.
 *
 * Dates are relative (`daysAgo`) rather than absolute so the seeded pipeline
 * still looks recent whenever it is run — a demo board full of inquiries from
 * 2026 tells you nothing about which ones need chasing today.
 */
export interface InquiryFollowUpSeed {
  note: string;
  daysAgo: number;
  nextFollowUpInDays?: number;
}

export interface InquirySourcingSeed {
  itemDescription: string;
  preferredBrand?: string;
  partNumber?: string;
  specifications?: string;
  quantity?: number;
  unit?: ProductUnit;
  urgency?: Urgency;
  isRepeatRequirement?: boolean;
  application?: string;
  daysUntilTarget?: number;
}

export interface InquirySeed {
  type: InquiryType;
  status: InquiryStatus;
  priority: InquiryPriority;
  source: InquirySource;
  customer: {
    name: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    company?: string;
    city?: string;
    designation?: string;
  };
  /** Resolved to product refs by the seeder. */
  itemSkus?: string[];
  sourcing?: InquirySourcingSeed;
  message?: string;
  preferredContactMethod?: ContactMethod;
  preferredContactTime?: string;
  internalQuotedAmount?: number;
  lostReason?: string;
  followUps?: InquiryFollowUpSeed[];
  daysAgo: number;
}
