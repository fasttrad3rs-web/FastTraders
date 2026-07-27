import { env } from './env';

/**
 * Static business data and site-wide constants.
 * Strings live here (rather than inline in components) so they can be swapped
 * for an i18n dictionary when Urdu support is added.
 */

export const SITE = {
  name: 'Fast Traders',
  legalName: 'Fast Traders',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  shortDescription:
    'Industrial and electrical equipment, parts and accessories supplier in Lahore, Pakistan.',
  url: env.NEXT_PUBLIC_SITE_URL,
  locale: 'en_PK',
  owner: 'Sharjeel Bin Ejaz',
} as const;

export const CONTACT = {
  address: {
    line1: 'Shop No. 30, Grace Tower',
    line2: 'Bull Road',
    city: 'Lahore',
    country: 'Pakistan',
    full: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  },
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
  whatsappDigits: env.NEXT_PUBLIC_WHATSAPP_NUMBER,
} as const;

export const CURRENCY = {
  code: 'PKR',
  symbol: 'Rs.',
} as const;

/** Product pricing behaviour — drives the dual cart system. */
export const PRICING_MODES = ['retail', 'quote', 'both'] as const;

/** Brands stocked / authorised. */
export const BRANDS = [
  'Terasaki',
  'National',
  'Fuji Electric',
  'Mitsubishi Electric',
  'Hager',
  'Schneider Electric',
  'Autonics',
  'IDEC',
  'DELAB',
  'Pilz',
  'WAGO',
  'Torex',
] as const;

/** Top-level product categories. */
export const PRODUCT_CATEGORIES = [
  'Circuit Breakers',
  'Cables & Wires',
  'Contactors & Relays',
  'Distribution Boards & Panels',
  'Busbars & Switchgear',
  'PLCs & HMIs',
  'VFDs & Drives',
  'Sensors',
  'Encoders',
  'Timers & Counters',
  'Temperature Controllers',
  'Push Buttons & Indicators',
  'Switches',
  'Safety Products',
  'Terminal Blocks & Connectors',
  'Power Supplies',
  'Transformers & Capacitors',
  'Motors & Starters',
  'Tools & Accessories',
] as const;

/** Storage keys for persisted Zustand slices. */
export const STORAGE_KEYS = {
  cart: 'ft.cart.v1',
  inquiry: 'ft.inquiry.v1',
  recentlyViewed: 'ft.recent.v1',
} as const;

/** Default pagination page size for catalogue listings. */
export const DEFAULT_PAGE_SIZE = 24;
