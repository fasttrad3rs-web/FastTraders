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

/**
 * Shop hours, as displayed. Mon–Sat 10:00–19:00, closed Sunday, with the
 * Friday prayer break spelled out — a buyer who drives to Bull Road at 1:30
 * on a Friday and finds it shut is a buyer you have annoyed for nothing.
 */
export const BUSINESS_HOURS = [
  { days: 'Monday – Thursday', hours: '10:00 – 19:00' },
  { days: 'Friday', hours: '10:00 – 19:00 (closed 13:00 – 14:30)' },
  { days: 'Saturday', hours: '10:00 – 19:00' },
  { days: 'Sunday', hours: 'Closed' },
] as const;

/**
 * Directions link. A search URL rather than a place ID: the exact pin is
 * still to be confirmed with the client, and a search for the address gets
 * someone to Grace Tower today without pretending to a precision we lack.
 */
export const MAP_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Grace Tower, Bull Road, Lahore, Pakistan');

/**
 * Only the admin ever formats money — internal cost, a quoted amount, pipeline
 * figures. Nothing public renders currency, which is why `formatPKR` appears
 * on no storefront page.
 */
export const CURRENCY = {
  code: 'PKR',
  symbol: 'Rs.',
} as const;

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

/**
 * Cities offered in the contact forms.
 *
 * Ordered by where the trade actually is rather than by population: Lahore
 * first because it is the counter's own city, then the industrial belt around
 * it, then the rest. "Other" is last and always present — a free-text-only
 * field invites typos that make the admin list unfilterable, but a closed list
 * would turn away a buyer from a town nobody thought of.
 */
export const PAKISTANI_CITIES = [
  'Lahore',
  'Karachi',
  'Faisalabad',
  'Sialkot',
  'Gujranwala',
  'Gujrat',
  'Islamabad',
  'Rawalpindi',
  'Multan',
  'Sheikhupura',
  'Kasur',
  'Sargodha',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Sukkur',
  'Bahawalpur',
  'Rahim Yar Khan',
  'Abbottabad',
  'Other',
] as const;

/** Storage keys for persisted Zustand slices. */
export const STORAGE_KEYS = {
  inquiry: 'ft.inquiry.v1',
  recentlyViewed: 'ft.recent.v1',
} as const;

/** Default pagination page size for catalogue listings. */
export const DEFAULT_PAGE_SIZE = 24;
