import type { CategorySeed } from './types';

/**
 * Category tree for industrial & electrical goods.
 * Three levels maximum, e.g. Switchgear & Protection > Circuit Breakers > MCCB.
 * Parents must appear before their children — the runner inserts in order.
 */
export const categories: CategorySeed[] = [
  /* ------------------------ 1. Switchgear & Protection ------------------- */
  {
    name: 'Switchgear & Protection',
    slug: 'switchgear-protection',
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
    parent: 'switchgear-protection',
    icon: 'Zap',
    displayOrder: 1,
    isFeatured: true,
    description: 'MCB, MCCB, ACB, RCCB and ELCB protection devices from authorised brands.',
  },
  { name: 'MCB', slug: 'mcb', parent: 'circuit-breakers', displayOrder: 1, description: 'Miniature circuit breakers, 1–63 A, B/C/D curves.' },
  { name: 'MCCB', slug: 'mccb', parent: 'circuit-breakers', displayOrder: 2, description: 'Moulded case circuit breakers, 16–1600 A.' },
  { name: 'ACB', slug: 'acb', parent: 'circuit-breakers', displayOrder: 3, description: 'Air circuit breakers for main incomers, 630–6300 A.' },
  { name: 'RCCB & ELCB', slug: 'rccb-elcb', parent: 'circuit-breakers', displayOrder: 4, description: 'Residual current and earth leakage protection.' },
  {
    name: 'Distribution Boards & Panels',
    slug: 'distribution-boards-panels',
    parent: 'switchgear-protection',
    icon: 'LayoutGrid',
    displayOrder: 2,
    description: 'Ready-made and custom-built distribution boards, MCC and PFI panels.',
  },
  {
    name: 'Busbars & Enclosures',
    slug: 'busbars-enclosures',
    parent: 'switchgear-protection',
    icon: 'Box',
    displayOrder: 3,
    description: 'Copper busbar, insulators, DIN rail and panel enclosures.',
  },

  /* ------------------------ 2. Control & Automation ---------------------- */
  {
    name: 'Control & Automation',
    slug: 'control-automation',
    parent: null,
    icon: 'Cpu',
    displayOrder: 2,
    isFeatured: true,
    description: 'PLCs, HMIs, drives, sensors and process controllers for factory automation.',
  },
  { name: 'PLCs & HMIs', slug: 'plcs-hmis', parent: 'control-automation', icon: 'MonitorCog', displayOrder: 1, isFeatured: true, description: 'Programmable logic controllers, operator panels and expansion I/O.' },
  { name: 'VFDs & Drives', slug: 'vfds-drives', parent: 'control-automation', icon: 'Gauge', displayOrder: 2, isFeatured: true, description: 'Variable frequency drives and soft starters, 0.4–400 kW.' },
  { name: 'Sensors', slug: 'sensors', parent: 'control-automation', icon: 'Radar', displayOrder: 3, description: 'Proximity, photoelectric and fibre-optic sensing.' },
  { name: 'Proximity Sensors', slug: 'proximity-sensors', parent: 'sensors', displayOrder: 1, description: 'Inductive and capacitive proximity switches.' },
  { name: 'Photoelectric Sensors', slug: 'photoelectric-sensors', parent: 'sensors', displayOrder: 2, description: 'Through-beam, retro-reflective and diffuse sensors.' },
  { name: 'Encoders', slug: 'encoders', parent: 'control-automation', icon: 'RotateCw', displayOrder: 4, description: 'Incremental and absolute rotary encoders.' },
  { name: 'Timers & Counters', slug: 'timers-counters', parent: 'control-automation', icon: 'Timer', displayOrder: 5, description: 'Panel-mount timers, counters and tachometers.' },
  { name: 'Temperature Controllers', slug: 'temperature-controllers', parent: 'control-automation', icon: 'Thermometer', displayOrder: 6, description: 'PID and ON/OFF controllers, sensors and SSRs.' },

  /* ------------------------ 3. Control Components ------------------------ */
  {
    name: 'Control Components',
    slug: 'control-components',
    parent: null,
    icon: 'ToggleLeft',
    displayOrder: 3,
    isFeatured: true,
    description: 'The switching and interfacing hardware inside every control panel.',
  },
  { name: 'Contactors & Relays', slug: 'contactors-relays', parent: 'control-components', icon: 'Power', displayOrder: 1, isFeatured: true, description: 'Power contactors, control relays and overload protection.' },
  { name: 'Contactors', slug: 'contactors', parent: 'contactors-relays', displayOrder: 1, description: 'AC/DC power contactors, 6–800 A.' },
  { name: 'Overload Relays', slug: 'overload-relays', parent: 'contactors-relays', displayOrder: 2, description: 'Thermal and electronic motor overload relays.' },
  { name: 'Control Relays', slug: 'control-relays', parent: 'contactors-relays', displayOrder: 3, description: 'Plug-in interface relays and sockets.' },
  { name: 'Push Buttons & Indicators', slug: 'push-buttons-indicators', parent: 'control-components', icon: 'CircleDot', displayOrder: 2, description: '22 mm pilot devices: buttons, lamps, selector switches, E-stops.' },
  { name: 'Switches', slug: 'switches', parent: 'control-components', icon: 'ToggleRight', displayOrder: 3, description: 'Limit switches, cam switches, changeover and isolator switches.' },
  { name: 'Terminal Blocks & Connectors', slug: 'terminal-blocks-connectors', parent: 'control-components', icon: 'Cable', displayOrder: 4, description: 'DIN-rail terminals, splicing connectors and markers.' },

  /* --------------------------- 4. Cables & Wiring ------------------------ */
  {
    name: 'Cables & Wiring',
    slug: 'cables-wiring',
    parent: null,
    icon: 'Cable',
    displayOrder: 4,
    isFeatured: true,
    description: 'Power, control and building cable to IEC and PSQCA standards.',
  },
  { name: 'Power Cables', slug: 'power-cables', parent: 'cables-wiring', displayOrder: 1, description: 'PVC and XLPE insulated multi-core power cable, armoured and unarmoured.' },
  { name: 'Control & Instrumentation Cables', slug: 'control-instrumentation-cables', parent: 'cables-wiring', displayOrder: 2, description: 'Screened multi-core control and signal cable.' },
  { name: 'Building Wire', slug: 'building-wire', parent: 'cables-wiring', displayOrder: 3, description: 'Single-core copper house wiring in standard coil lengths.' },

  /* --------------------------- 5. Power & Motors ------------------------- */
  {
    name: 'Power & Motors',
    slug: 'power-motors',
    parent: null,
    icon: 'BatteryCharging',
    displayOrder: 5,
    description: 'Power supplies, transformers, capacitors and motor control gear.',
  },
  { name: 'Power Supplies', slug: 'power-supplies', parent: 'power-motors', displayOrder: 1, description: 'DIN-rail switch-mode power supplies, 24 VDC and 12 VDC.' },
  { name: 'Transformers', slug: 'transformers', parent: 'power-motors', displayOrder: 2, description: 'Control, isolation and step-down transformers.' },
  { name: 'Capacitors', slug: 'capacitors', parent: 'power-motors', displayOrder: 3, description: 'Power-factor correction capacitors and PFI accessories.' },
  { name: 'Motors & Starters', slug: 'motors-starters', parent: 'power-motors', displayOrder: 4, description: 'Motor protection circuit breakers, DOL and star-delta starters.' },

  /* -------------------------- 6. Safety Products ------------------------- */
  {
    name: 'Safety Products',
    slug: 'safety-products',
    parent: null,
    icon: 'ShieldAlert',
    displayOrder: 6,
    description: 'Machine safety to ISO 13849 / IEC 62061.',
  },
  { name: 'Safety Relays', slug: 'safety-relays', parent: 'safety-products', displayOrder: 1, description: 'Emergency-stop and guard-monitoring safety relays.' },
  { name: 'Safety Switches', slug: 'safety-switches', parent: 'safety-products', displayOrder: 2, description: 'Coded magnetic switches, interlocks and light curtains.' },

  /* ------------------------- 7. Tools & Accessories ---------------------- */
  {
    name: 'Tools & Accessories',
    slug: 'tools-accessories',
    parent: null,
    icon: 'Wrench',
    displayOrder: 7,
    description: 'Crimping tools, testers, cable ties, ferrules and panel accessories.',
  },
];
