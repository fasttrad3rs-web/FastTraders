import type { PricingMode, StockStatus } from '@/types';

/**
 * Mock data for Phase 5.
 * Shapes match the real API contract, so swapping in TanStack Query later is
 * a change of source, not a change of component.
 */

export interface MockCategory {
  name: string;
  slug: string;
  icon: string;
  children: { name: string; slug: string; children?: { name: string; slug: string }[] }[];
}

export const mockCategories: MockCategory[] = [
  {
    name: 'Switchgear & Protection',
    slug: 'switchgear-protection',
    icon: 'ShieldCheck',
    children: [
      {
        name: 'Circuit Breakers',
        slug: 'circuit-breakers',
        children: [
          { name: 'MCB', slug: 'mcb' },
          { name: 'MCCB', slug: 'mccb' },
          { name: 'ACB', slug: 'acb' },
          { name: 'RCCB & ELCB', slug: 'rccb-elcb' },
        ],
      },
      { name: 'Distribution Boards & Panels', slug: 'distribution-boards-panels' },
      { name: 'Busbars & Enclosures', slug: 'busbars-enclosures' },
    ],
  },
  {
    name: 'Control & Automation',
    slug: 'control-automation',
    icon: 'Cpu',
    children: [
      { name: 'PLCs & HMIs', slug: 'plcs-hmis' },
      { name: 'VFDs & Drives', slug: 'vfds-drives' },
      {
        name: 'Sensors',
        slug: 'sensors',
        children: [
          { name: 'Proximity Sensors', slug: 'proximity-sensors' },
          { name: 'Photoelectric Sensors', slug: 'photoelectric-sensors' },
        ],
      },
      { name: 'Encoders', slug: 'encoders' },
      { name: 'Timers & Counters', slug: 'timers-counters' },
      { name: 'Temperature Controllers', slug: 'temperature-controllers' },
    ],
  },
  {
    name: 'Control Components',
    slug: 'control-components',
    icon: 'ToggleLeft',
    children: [
      { name: 'Contactors & Relays', slug: 'contactors-relays' },
      { name: 'Push Buttons & Indicators', slug: 'push-buttons-indicators' },
      { name: 'Switches', slug: 'switches' },
      { name: 'Terminal Blocks & Connectors', slug: 'terminal-blocks-connectors' },
    ],
  },
  {
    name: 'Cables & Wiring',
    slug: 'cables-wiring',
    icon: 'Cable',
    children: [
      { name: 'Power Cables', slug: 'power-cables' },
      { name: 'Control & Instrumentation Cables', slug: 'control-instrumentation-cables' },
      { name: 'Building Wire', slug: 'building-wire' },
    ],
  },
  {
    name: 'Power & Motors',
    slug: 'power-motors',
    icon: 'BatteryCharging',
    children: [
      { name: 'Power Supplies', slug: 'power-supplies' },
      { name: 'Transformers', slug: 'transformers' },
      { name: 'Capacitors', slug: 'capacitors' },
      { name: 'Motors & Starters', slug: 'motors-starters' },
    ],
  },
  {
    name: 'Safety Products',
    slug: 'safety-products',
    icon: 'ShieldAlert',
    children: [
      { name: 'Safety Relays', slug: 'safety-relays' },
      { name: 'Safety Switches', slug: 'safety-switches' },
    ],
  },
  { name: 'Tools & Accessories', slug: 'tools-accessories', icon: 'Wrench', children: [] },
];

export interface MockBrand {
  name: string;
  slug: string;
  country: string;
}

export const mockBrands: MockBrand[] = [
  { name: 'Terasaki', slug: 'terasaki', country: 'Japan' },
  { name: 'Mitsubishi Electric', slug: 'mitsubishi-electric', country: 'Japan' },
  { name: 'Schneider Electric', slug: 'schneider-electric', country: 'France' },
  { name: 'Fuji Electric', slug: 'fuji-electric', country: 'Japan' },
  { name: 'Hager', slug: 'hager', country: 'Germany' },
  { name: 'Autonics', slug: 'autonics', country: 'South Korea' },
  { name: 'IDEC', slug: 'idec', country: 'Japan' },
  { name: 'Pilz', slug: 'pilz', country: 'Germany' },
  { name: 'WAGO', slug: 'wago', country: 'Germany' },
  { name: 'National', slug: 'national', country: 'Pakistan' },
  { name: 'DELAB', slug: 'delab', country: 'Turkey' },
  { name: 'Torex', slug: 'torex', country: 'Pakistan' },
];

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  pricingMode: PricingMode;
  price?: number;
  comparePrice?: number;
  stockStatus: StockStatus;
  unit: string;
  image: string;
  ratingAvg: number;
  reviewCount: number;
  isFeatured?: boolean;
}

/** Local branded placeholder; the SKU is overlaid by <ProductImage>. */
const placeholder = (_sku: string): string => '/placeholders/default.svg';

export const mockProducts: MockProduct[] = [
  {
    id: '1', name: 'Schneider EasyPact CVS100F 3P 100A MCCB 36kA',
    slug: 'schneider-easypact-cvs100f-3p-100a-mccb', sku: 'SCH-CVS100F-3P100',
    brand: 'Schneider Electric', category: 'MCCB', pricingMode: 'both',
    price: 38500, comparePrice: 44000, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('SCH-CVS100F'), ratingAvg: 4.6, reviewCount: 12, isFeatured: true,
  },
  {
    id: '2', name: 'Terasaki TemBreak 2 S250-NJ 3P 250A MCCB',
    slug: 'terasaki-tembreak-2-s250-nj-3p-250a-mccb', sku: 'TER-S250NJ-3P250',
    brand: 'Terasaki', category: 'MCCB', pricingMode: 'quote',
    stockStatus: 'low_stock', unit: 'piece',
    image: placeholder('TER-S250NJ'), ratingAvg: 4.8, reviewCount: 5, isFeatured: true,
  },
  {
    id: '3', name: 'Schneider TeSys LC1D18M7 Contactor 18A 3P 220VAC',
    slug: 'schneider-tesys-lc1d18m7-contactor-18a', sku: 'SCH-LC1D18M7',
    brand: 'Schneider Electric', category: 'Contactors', pricingMode: 'retail',
    price: 8900, comparePrice: 10200, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('SCH-LC1D18M7'), ratingAvg: 4.7, reviewCount: 31,
  },
  {
    id: '4', name: 'Autonics PRCM18-8DN Proximity Sensor M18 PNP NO',
    slug: 'autonics-prcm18-8dn-proximity-sensor', sku: 'AUT-PRCM18-8DN',
    brand: 'Autonics', category: 'Proximity Sensors', pricingMode: 'retail',
    price: 3200, comparePrice: 3800, stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('AUT-PRCM18'), ratingAvg: 4.5, reviewCount: 24,
  },
  {
    id: '5', name: 'Mitsubishi MELSEC iQ-F FX5U-32MT/ES PLC',
    slug: 'mitsubishi-melsec-iq-f-fx5u-32mt-es-plc', sku: 'MIT-FX5U-32MTES',
    brand: 'Mitsubishi Electric', category: 'PLCs & HMIs', pricingMode: 'quote',
    stockStatus: 'in_stock', unit: 'piece',
    image: placeholder('MIT-FX5U'), ratingAvg: 4.9, reviewCount: 8, isFeatured: true,
  },
  {
    id: '6', name: 'Torex 3-Core 2.5mm² PVC Copper Cable (100m Roll)',
    slug: 'torex-3-core-2-5mm-pvc-copper-cable-100m', sku: 'TOR-CAB-3C25-100',
    brand: 'Torex', category: 'Power Cables', pricingMode: 'retail',
    price: 46500, comparePrice: 52000, stockStatus: 'in_stock', unit: 'roll',
    image: placeholder('TOR-CAB-3C25'), ratingAvg: 4.4, reviewCount: 17,
  },
  {
    id: '7', name: 'Pilz PNOZ X2.8P Safety Relay 24V AC/DC',
    slug: 'pilz-pnoz-x2-8p-safety-relay', sku: 'PIL-PNOZX28P',
    brand: 'Pilz', category: 'Safety Relays', pricingMode: 'quote',
    stockStatus: 'on_order', unit: 'piece',
    image: placeholder('PIL-PNOZX28P'), ratingAvg: 5, reviewCount: 3,
  },
  {
    id: '8', name: 'WAGO 221-413 Lever Splicing Connector 3-Way (Box of 50)',
    slug: 'wago-221-413-lever-splicing-connector-3-way', sku: 'WAG-221413-B50',
    brand: 'WAGO', category: 'Terminal Blocks', pricingMode: 'retail',
    price: 4300, comparePrice: 4900, stockStatus: 'out_of_stock', unit: 'box',
    image: placeholder('WAG-221413'), ratingAvg: 4.8, reviewCount: 46,
  },
];

/** Prefix search over the mock catalogue, mimicking `/search/suggest`. */
export function mockSuggest(term: string, limit = 6): MockProduct[] {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];

  return mockProducts
    .filter(
      (product) =>
        product.sku.toLowerCase().includes(needle) ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

/** Flat category list for the search bar's scope dropdown. */
export const mockSearchScopes = [
  { label: 'All categories', value: 'all' },
  ...mockCategories.map((category) => ({ label: category.name, value: category.slug })),
];
