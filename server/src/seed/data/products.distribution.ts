import type { ProductSeed } from './types';

/**
 * Distribution catalogue: air circuit breakers, distribution boards and busbar.
 * Large switchgear is quote-only — price depends on trip unit, accessories and
 * current stock.
 */
export const distributionProducts: ProductSeed[] = [
  {
    name: 'Terasaki AR208S 3P 800A Air Circuit Breaker',
    slug: 'terasaki-ar208s-3p-800a-acb',
    sku: 'TER-AR208S-3P800',
    partNumber: 'AR208S',
    brand: 'terasaki',
    category: 'circuit-breakers',
    subCategory: 'acb',
    pricingMode: 'quote',
    stock: 1,
    shortDescription: 'Draw-out 800 A air circuit breaker with electronic overcurrent relay.',
    description:
      '<p>The Terasaki AR series air circuit breaker is specified as a main incomer on LT panels up to 6300 A. The AR208S is an 800 A draw-out unit supplied with an electronic overcurrent relay offering long-time, short-time, instantaneous and earth-fault protection.</p><p>Lead time and price depend on trip unit selection, accessories and current stock — please request a quotation.</p>',
    specifications: [
      { group: 'Electrical', key: 'Rated Current (In)', value: '800 A' },
      { group: 'Electrical', key: 'Poles', value: '3P' },
      { group: 'Electrical', key: 'Breaking Capacity (Icu @ 415 V)', value: '65 kA' },
      { group: 'Electrical', key: 'Trip Unit', value: 'Electronic OCR (L/S/I/G)' },
      { group: 'Mechanical', key: 'Execution', value: 'Draw-out' },
      { group: 'Standards', key: 'Compliance', value: 'IEC 60947-2' },
    ],
    tags: ['acb', 'terasaki', '800a', 'air circuit breaker', 'draw-out'],
    isFeatured: true,
  },
  {
    name: 'Mitsubishi AE1600-SW 3P 1600A Air Circuit Breaker',
    slug: 'mitsubishi-ae1600-sw-3p-1600a-acb',
    sku: 'MIT-AE1600SW-3P',
    partNumber: 'AE1600-SW',
    brand: 'mitsubishi-electric',
    category: 'circuit-breakers',
    subCategory: 'acb',
    pricingMode: 'quote',
    stock: 0,
    shortDescription: '1600 A three-pole draw-out ACB with digital trip relay and communications.',
    description:
      '<p>Mitsubishi Electric Super AE-SW series air circuit breaker rated 1600 A. Supplied with a digital measuring and display trip relay; CC-Link and Modbus communication options are available for switchboard monitoring.</p><p>Typically an indent item — lead time confirmed at quotation.</p>',
    specifications: [
      { group: 'Electrical', key: 'Rated Current (In)', value: '1600 A' },
      { group: 'Electrical', key: 'Poles', value: '3P' },
      { group: 'Electrical', key: 'Breaking Capacity (Icu @ 415 V)', value: '65 kA' },
      { group: 'Electrical', key: 'Trip Relay', value: 'Digital, with metering display' },
      { group: 'Mechanical', key: 'Execution', value: 'Draw-out' },
      { group: 'Standards', key: 'Compliance', value: 'IEC 60947-2' },
    ],
    tags: ['acb', 'mitsubishi', '1600a', 'indent'],
  },
  {
    name: 'Hager 12-Way TPN Distribution Board IP42',
    slug: 'hager-12-way-tpn-distribution-board-ip42',
    sku: 'HAG-DB-TPN12',
    partNumber: 'VE212U',
    brand: 'hager',
    category: 'distribution-boards-panels',
    pricingMode: 'both',
    price: 32500,
    costPrice: 25800,
    stock: 7,
    unit: 'piece',
    shortDescription: 'Three-phase 12-way distribution board with 100 A busbar and IP42 enclosure.',
    description:
      '<p>Surface-mounting three-phase and neutral distribution board with a 12-way outgoing capacity, pre-fitted busbar assembly and separate neutral and earth bars. Powder-coated steel enclosure rated IP42.</p><p>Can be supplied factory-populated with MCBs and an incoming MCCB — request a quote for a fully assembled board.</p>',
    specifications: [
      { group: 'Electrical', key: 'Ways', value: '12 (TPN)' },
      { group: 'Electrical', key: 'Busbar Rating', value: '100 A' },
      { group: 'Electrical', key: 'System', value: '415 V, 3-phase + neutral' },
      { group: 'Mechanical', key: 'Ingress Protection', value: 'IP42' },
      { group: 'Mechanical', key: 'Mounting', value: 'Surface' },
    ],
    tags: ['distribution board', 'db', 'hager', 'tpn', '12 way'],
    isNewArrival: true,
  },
  {
    name: 'Electrolytic Copper Busbar 30 x 5 mm (per metre)',
    slug: 'electrolytic-copper-busbar-30x5mm',
    sku: 'GEN-BUSBAR-30X5',
    brand: 'torex',
    category: 'busbars-enclosures',
    pricingMode: 'both',
    price: 4850,
    costPrice: 4100,
    stock: 240,
    unit: 'meter',
    minOrderQty: 2,
    shortDescription: '99.9% electrolytic copper flat busbar, 30 × 5 mm, sold by the metre.',
    description:
      '<p>High-conductivity electrolytic copper busbar for panel building and distribution boards. Supplied in cut lengths; bulk lengths and tinning are available on request.</p>',
    specifications: [
      { group: 'Material', key: 'Grade', value: 'Electrolytic copper, 99.9%' },
      { group: 'Mechanical', key: 'Cross Section', value: '30 × 5 mm' },
      { group: 'Electrical', key: 'Approx. Current Rating', value: '415 A (open air, 35 °C)' },
      { group: 'Supply', key: 'Sold By', value: 'Metre' },
    ],
    tags: ['busbar', 'copper', 'panel building', '30x5'],
  },
];
