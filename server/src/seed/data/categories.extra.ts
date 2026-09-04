import type { CategorySeed } from './types';

/** Control components, safety and power. Continues `categories.core.ts`. */
export const categoriesExtra: CategorySeed[] = [
  /* ------------------------- 4. Control Components ----------------------- */
  {
    name: 'Control Components',
    slug: 'control-components',
    parent: null,
    icon: 'ToggleLeft',
    displayOrder: 4,
    isFeatured: true,
    description: 'Everything that goes on the door and the DIN rail of a control panel.',
  },
  {
    name: 'Contactors',
    slug: 'contactors',
    parent: 'control-components',
    displayOrder: 1,
    isFeatured: true,
    description: 'AC and DC contactors, 9 A to 800 A, with coil options.',
  },
  {
    name: 'Relays',
    slug: 'relays',
    parent: 'control-components',
    displayOrder: 2,
    description: 'Control relays, overload relays and solid-state relays.',
  },
  {
    name: 'Push Buttons',
    slug: 'push-buttons',
    parent: 'control-components',
    displayOrder: 3,
    description: '22 mm flush, extended and illuminated push buttons.',
  },
  {
    name: 'Selector Switches',
    slug: 'selector-switches',
    parent: 'control-components',
    displayOrder: 4,
    description: '2- and 3-position selectors, maintained and spring-return.',
  },
  {
    name: 'Indicators',
    slug: 'indicators',
    parent: 'control-components',
    displayOrder: 5,
    description: 'LED pilot lights, tower lamps and panel meters.',
  },
  {
    name: 'Limit Switches',
    slug: 'limit-switches',
    parent: 'control-components',
    displayOrder: 6,
    description: 'Roller, plunger and lever-arm limit switches.',
  },
  {
    name: 'Terminal Blocks',
    slug: 'terminal-blocks',
    parent: 'control-components',
    displayOrder: 7,
    description: 'Spring-cage and screw terminals, distribution blocks and connectors.',
  },

  /* -------------------------------- 5. Safety ---------------------------- */
  {
    name: 'Safety',
    slug: 'safety',
    parent: null,
    icon: 'ShieldAlert',
    displayOrder: 5,
    description: 'Machine safety to EN ISO 13849 and IEC 62061.',
  },
  {
    name: 'Safety Relays',
    slug: 'safety-relays',
    parent: 'safety',
    displayOrder: 1,
    description: 'Dual-channel monitoring relays for E-stop and guard circuits.',
  },
  {
    name: 'Light Curtains',
    slug: 'light-curtains',
    parent: 'safety',
    displayOrder: 2,
    description: 'Type 2 and Type 4 safety light curtains for press and robot guarding.',
  },
  {
    name: 'E-Stops',
    slug: 'e-stops',
    parent: 'safety',
    displayOrder: 3,
    description: 'Mushroom-head emergency stops, rope pulls and safety interlocks.',
  },

  /* -------------------------------- 6. Power ----------------------------- */
  {
    name: 'Power',
    slug: 'power',
    parent: null,
    icon: 'Zap',
    displayOrder: 6,
    isFeatured: true,
    description: 'Transformers, power supplies, capacitors and motor control.',
  },
  {
    name: 'Transformers',
    slug: 'transformers',
    parent: 'power',
    displayOrder: 1,
    description: 'Control, isolation and step-down transformers.',
  },
  {
    name: 'Power Supplies',
    slug: 'power-supplies',
    parent: 'power',
    displayOrder: 2,
    description: 'DIN-rail switch-mode supplies, 24 V DC and 12 V DC.',
  },
  {
    name: 'Capacitors',
    slug: 'capacitors',
    parent: 'power',
    displayOrder: 3,
    description: 'Power-factor correction capacitors and PFI panel components.',
  },
  {
    name: 'Motors & Starters',
    slug: 'motors-starters',
    parent: 'power',
    displayOrder: 4,
    description: 'Three-phase motors, DOL and star-delta starters, motor protection.',
  },
];
