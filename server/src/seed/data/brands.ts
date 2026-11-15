import type { BrandSeed } from './types';

/**
 * Every brand Fast Traders supplies.
 *
 * **Two different relationships live in this list.** The first twelve are
 * manufacturers Fast Traders holds a distributor account with — those are the
 * ones the FAQ's warranty answer and the terms page refer to. The rest are
 * supplied to order through the China network, and the storefront copy is
 * worded so that neither claim is made about the other. If that distinction
 * ever needs to be shown per brand rather than described in prose, it wants a
 * field on the model, not a comment here.
 *
 * `logo` points at a file in the *client's* `public/brand/logos/`, named after
 * the slug. Serving them from the front end rather than Cloudinary is
 * deliberate: these twelve change roughly never, and a local file costs no
 * round trip to a third party on a 3G first paint.
 *
 * Filenames are lower case to match the slug exactly. macOS is
 * case-insensitive and Vercel's Linux hosts are not, so a capitalised name
 * would resolve locally and 404 in production.
 */
export const brands: BrandSeed[] = [
  {
    name: 'Terasaki',
    slug: 'terasaki',
    logo: '/brand/logos/terasaki.png',
    country: 'Japan',
    website: 'https://www.terasaki.co.jp',
    description:
      'Japanese specialist in air and moulded-case circuit breakers. The TemBreak and AR series are long-standing favourites in Pakistani industrial switchgear panels.',
    isFeatured: true,
    displayOrder: 1,
  },
  {
    name: 'Mitsubishi Electric',
    slug: 'mitsubishi-electric',
    logo: '/brand/logos/mitsubishi-electric.png',
    country: 'Japan',
    website: 'https://www.mitsubishielectric.com',
    description:
      'Full-range automation manufacturer: MELSEC PLCs, GOT HMIs, FREQROL inverters and the NF/AE breaker families.',
    isFeatured: true,
    displayOrder: 2,
  },
  {
    name: 'Schneider Electric',
    slug: 'schneider-electric',
    logo: '/brand/logos/schneider-electric.png',
    country: 'France',
    website: 'https://www.se.com',
    description:
      'Global leader in energy management. Acti9, EasyPact, TeSys, Altivar and Modicon lines cover everything from a domestic MCB to a plant-wide control system.',
    isFeatured: true,
    displayOrder: 3,
  },
  {
    name: 'Fuji Electric',
    slug: 'fuji-electric',
    logo: '/brand/logos/fuji-electric.png',
    country: 'Japan',
    website: 'https://www.fujielectric.com',
    description:
      'Japanese manufacturer of low-voltage switchgear, SC-series contactors and the FRENIC family of variable frequency drives.',
    isFeatured: true,
    displayOrder: 4,
  },
  {
    name: 'Hager',
    slug: 'hager',
    logo: '/brand/logos/hager.png',
    country: 'Germany',
    website: 'https://www.hager.com',
    description:
      'German maker of modular devices, consumer units and distribution boards, widely specified for commercial building electrics.',
    isFeatured: true,
    displayOrder: 5,
  },
  {
    name: 'Autonics',
    slug: 'autonics',
    logo: '/brand/logos/autonics.png',
    country: 'South Korea',
    website: 'https://www.autonics.com',
    description:
      'Korean sensor and control specialist — proximity and photoelectric sensors, rotary encoders, counters, timers and temperature controllers at practical prices.',
    isFeatured: true,
    displayOrder: 6,
  },
  {
    name: 'IDEC',
    slug: 'idec',
    logo: '/brand/logos/idec.png',
    country: 'Japan',
    website: 'https://www.idec.com',
    description:
      'Japanese manufacturer of control components: pilot devices, relays and sockets, safety products and the SmartAXIS controller range.',
    displayOrder: 7,
  },
  {
    name: 'Pilz',
    slug: 'pilz',
    logo: '/brand/logos/pilz.png',
    country: 'Germany',
    website: 'https://www.pilz.com',
    description:
      'The reference brand for machine safety — PNOZ safety relays, PSEN sensors and safe automation systems.',
    displayOrder: 8,
  },
  {
    name: 'WAGO',
    slug: 'wago',
    logo: '/brand/logos/wago.png',
    country: 'Germany',
    website: 'https://www.wago.com',
    description:
      'Inventor of the spring-clamp terminal. Rail-mount terminal blocks, the 221 splicing connector range and I/O System fieldbus products.',
    displayOrder: 9,
  },
  {
    name: 'National',
    slug: 'national',
    logo: '/brand/logos/national.png',
    country: 'Pakistan',
    description:
      'Locally trusted value brand for MCBs, wiring accessories and building wire — the practical choice for domestic and light commercial work.',
    displayOrder: 10,
  },
  {
    name: 'DELAB',
    slug: 'delab',
    logo: '/brand/logos/delab.png',
    country: 'Turkey',
    description:
      'Power-factor correction specialist: low-voltage power capacitors, reactive power controllers and capacitor duty contactors.',
    displayOrder: 11,
  },
  {
    name: 'Torex',
    slug: 'torex',
    logo: '/brand/logos/torex.png',
    country: 'Pakistan',
    description:
      'Cables, wires and transformers manufactured to IEC and PSQCA standards for the Pakistani market.',
    displayOrder: 12,
  },

  /* ---------------------- Supplied to order, from 13 ---------------------- */

  {
    name: 'Allen-Bradley',
    slug: 'allen-bradley',
    logo: '/brand/logos/allen-bradley.png',
    country: 'United States',
    website: 'https://www.rockwellautomation.com',
    description:
      'Rockwell Automation’s control brand. ControlLogix and CompactLogix PLCs, PanelView terminals, PowerFlex drives and the 1492 terminal system.',
    displayOrder: 13,
  },
  {
    name: 'Danfoss',
    slug: 'danfoss',
    logo: '/brand/logos/danfoss.png',
    country: 'Denmark',
    website: 'https://www.danfoss.com',
    description:
      'Danish manufacturer of variable frequency drives and refrigeration controls. The VLT and VACON drive families are widely used on pumps, fans and HVAC plant.',
    displayOrder: 14,
  },
  {
    name: 'Carrier',
    slug: 'carrier',
    logo: '/brand/logos/carrier.png',
    country: 'United States',
    website: 'https://www.carrier.com',
    description:
      'Air conditioning, refrigeration and building services equipment, together with the controls and spares that go with them.',
    displayOrder: 15,
  },
  {
    name: 'TE Connectivity',
    slug: 'te-connectivity',
    logo: '/brand/logos/te-connectivity.png',
    country: 'Switzerland',
    website: 'https://www.te.com',
    description:
      'Connectors, terminals, relays and sensors for industrial wiring. The crimp terminal and heat-shrink ranges are panel-shop staples.',
    displayOrder: 16,
  },
  {
    name: 'CHINT',
    slug: 'chint',
    logo: '/brand/logos/chint.png',
    country: 'China',
    website: 'https://www.chintglobal.com',
    description:
      'One of China’s largest low-voltage manufacturers: MCBs, MCCBs, contactors, overload relays and distribution equipment at volume pricing.',
    displayOrder: 17,
  },
  {
    name: 'ENTES',
    slug: 'entes',
    logo: '/brand/logos/entes.png',
    country: 'Turkey',
    website: 'https://www.entes.com.tr',
    description:
      'Turkish maker of power analysers, reactive power controllers, multimeters and current transformers for distribution panels and PFI work.',
    displayOrder: 18,
  },
  {
    name: 'Tense',
    slug: 'tense',
    logo: '/brand/logos/tense.png',
    country: 'Turkey',
    description:
      'Turkish manufacturer of protection relays, phase-failure and voltage monitoring devices, timers and power-factor controllers.',
    displayOrder: 19,
  },
  {
    name: 'TENGEN',
    slug: 'tengen',
    logo: '/brand/logos/tengen.png',
    country: 'China',
    description:
      'Chinese low-voltage switchgear manufacturer: miniature and moulded-case circuit breakers, contactors, isolators and distribution boxes.',
    displayOrder: 20,
  },
  {
    name: 'TOMZN',
    slug: 'tomzn',
    logo: '/brand/logos/tomzn.png',
    country: 'China',
    description:
      'Chinese manufacturer of din-rail protection devices — adjustable over/under-voltage protectors, surge protection and energy meters.',
    displayOrder: 21,
  },
  {
    /*
     * The wordmark is set in Greek letterforms — Κ ρ ι ο — which read as the
     * Latin "KPIO". Worth knowing before somebody decides the logo file is the
     * wrong one and replaces it.
     */
    name: 'KPIO',
    slug: 'kpio',
    logo: '/brand/logos/kpio.png',
    country: 'China',
    description:
      'Valve automation accessories: limit switch boxes, visual position indicators and solenoid valves for quarter-turn pneumatic and electric actuators.',
    displayOrder: 22,
  },
];
