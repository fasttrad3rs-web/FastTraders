import type { CategorySeed } from './types';

/**
 * Category tree for industrial & electrical goods. Three levels maximum.
 * Parents must appear before their children — the runner inserts in order.
 *
 * The shape follows how a Pakistani panel builder actually shops: by the kind
 * of device, not by manufacturer. Someone needs "a 250 A MCCB" and works down
 * Switchgear > Circuit Breakers > MCCB; nobody browses "Terasaki" first.
 */
export const categoriesCore: CategorySeed[] = [
  /* ------------------------------ 1. Switchgear -------------------------- */
  {
    name: 'Switchgear',
    slug: 'switchgear',
    parent: null,
    icon: 'ShieldCheck',
    displayOrder: 1,
    isFeatured: true,
    description:
      'Circuit protection and distribution equipment for industrial and commercial installations.',
  },
  {
    name: 'Circuit Breakers',
    slug: 'circuit-breakers',
    parent: 'switchgear',
    icon: 'Zap',
    displayOrder: 1,
    isFeatured: true,
    description: 'MCB, MCCB, ACB, RCCB and ELCB protection devices from authorised brands.',
  },
  {
    name: 'MCB',
    slug: 'mcb',
    parent: 'circuit-breakers',
    displayOrder: 1,
    description: 'Miniature circuit breakers, 1–63 A, B/C/D curves.',
  },
  {
    name: 'MCCB',
    slug: 'mccb',
    parent: 'circuit-breakers',
    displayOrder: 2,
    description: 'Moulded case circuit breakers, 16–1600 A.',
  },
  {
    name: 'ACB',
    slug: 'acb',
    parent: 'circuit-breakers',
    displayOrder: 3,
    description: 'Air circuit breakers for main incomers, 630–6300 A.',
  },
  {
    name: 'RCCB',
    slug: 'rccb',
    parent: 'circuit-breakers',
    displayOrder: 4,
    description: 'Residual current circuit breakers, 30 mA to 300 mA sensitivity.',
  },
  {
    name: 'ELCB',
    slug: 'elcb',
    parent: 'circuit-breakers',
    displayOrder: 5,
    description: 'Earth leakage circuit breakers for older installations.',
  },
  {
    name: 'Distribution Boards & Panels',
    slug: 'distribution-boards-panels',
    parent: 'switchgear',
    icon: 'LayoutGrid',
    displayOrder: 2,
    description: 'Ready-made and custom-built distribution boards, MCC and PFI panels.',
  },
  {
    name: 'Busbars & Enclosures',
    slug: 'busbars-enclosures',
    parent: 'switchgear',
    icon: 'Box',
    displayOrder: 3,
    description: 'Copper busbar, DIN rail, trunking and sheet-steel enclosures.',
  },

  /* ------------------------------ 2. Automation -------------------------- */
  {
    name: 'Automation',
    slug: 'automation',
    parent: null,
    icon: 'Cpu',
    displayOrder: 2,
    isFeatured: true,
    description: 'PLCs, HMIs, drives and sensing for machine and process control.',
  },
  {
    name: 'PLCs',
    slug: 'plcs',
    parent: 'automation',
    displayOrder: 1,
    isFeatured: true,
    description: 'Compact and modular programmable logic controllers with expansion I/O.',
  },
  {
    name: 'HMIs',
    slug: 'hmis',
    parent: 'automation',
    displayOrder: 2,
    description: 'Operator touch panels from 4" to 15".',
  },
  {
    name: 'VFDs',
    slug: 'vfds',
    parent: 'automation',
    displayOrder: 3,
    isFeatured: true,
    description: 'Variable frequency drives and soft starters, 0.4 kW upwards.',
  },
  {
    name: 'Sensors',
    slug: 'sensors',
    parent: 'automation',
    displayOrder: 4,
    description: 'Inductive, capacitive, photoelectric and ultrasonic sensing.',
  },
  {
    name: 'Proximity Sensors',
    slug: 'proximity-sensors',
    parent: 'sensors',
    displayOrder: 1,
    description: 'Inductive and capacitive proximity switches, M8 to M30.',
  },
  {
    name: 'Photoelectric Sensors',
    slug: 'photoelectric-sensors',
    parent: 'sensors',
    displayOrder: 2,
    description: 'Through-beam, retro-reflective and diffuse sensing.',
  },
  {
    name: 'Encoders',
    slug: 'encoders',
    parent: 'automation',
    displayOrder: 5,
    description: 'Incremental and absolute rotary encoders.',
  },
  {
    name: 'Timers',
    slug: 'timers',
    parent: 'automation',
    displayOrder: 6,
    description: 'Analogue and digital timers, counters and tachometers.',
  },
  {
    name: 'Temperature Controllers',
    slug: 'temperature-controllers',
    parent: 'automation',
    displayOrder: 7,
    description: 'PID and on/off controllers with thermocouple and RTD input.',
  },

  /* --------------------------- 3. Cables & Wires ------------------------- */
  {
    name: 'Cables & Wires',
    slug: 'cables-wires',
    parent: null,
    icon: 'Cable',
    displayOrder: 3,
    isFeatured: true,
    description: 'Power, control, instrumentation and flexible cable by the metre or drum.',
  },
  {
    name: 'Power Cable',
    slug: 'power-cable',
    parent: 'cables-wires',
    displayOrder: 1,
    description: 'XLPE and PVC armoured and unarmoured cable for sub-main runs.',
  },
  {
    name: 'Control Cable',
    slug: 'control-cable',
    parent: 'cables-wires',
    displayOrder: 2,
    description: 'Multicore control cable for panel and field wiring.',
  },
  {
    name: 'Instrumentation Cable',
    slug: 'instrumentation-cable',
    parent: 'cables-wires',
    displayOrder: 3,
    description: 'Screened pairs and triples for 4–20 mA and RTD signals.',
  },
  {
    name: 'Flexible Cable',
    slug: 'flexible-cable',
    parent: 'cables-wires',
    displayOrder: 4,
    description: 'Fine-strand flexible cable and single-core building wire.',
  }
];
