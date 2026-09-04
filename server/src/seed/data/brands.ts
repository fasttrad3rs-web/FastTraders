import type { BrandSeed } from './types';

/**
 * The 12 brands Fast Traders is authorised to stock.
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
];
