import type { BannerPosition } from '../../types';

export interface BannerSeed {
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  ctaText?: string;
  position: BannerPosition;
  displayOrder: number;
}

/**
 * Homepage banners.
 *
 * Artwork points at branded SVGs in `client/public/placeholders/banners/`.
 * These were third-party `placehold.co` URLs, which broke the home page:
 * `next/image` rejects any hostname absent from `remotePatterns`, and a seed
 * that only renders when a stranger's CDN is up is not a seed. Local files
 * also mean the storefront works with no internet.
 *
 * Replace each `image` with the client's Cloudinary URL before launch — the
 * "ARTWORK PENDING" strip on every placeholder is there so nobody ships one
 * by accident.
 */
/*
 * The desktop hero art is the Fast Traders brand card until real photography
 * exists. It is 1200x630 (1.9:1) against a 16:10 slot, so the hero renders it
 * `object-contain` — `object-cover` crops 16% of the width and clips the logo
 * mark and the first letter of every line. See `hero.tsx`.
 *
 * `mobileImage` stays as the purpose-drawn portrait line art: this card at
 * 4:5 would be a thin band in a lot of empty space.
 */
export const banners: BannerSeed[] = [
  {
    title: 'Industrial Switchgear, In Stock in Lahore',
    subtitle:
      'Terasaki, Schneider Electric, Mitsubishi and Fuji circuit breakers ready for same-day collection from Bull Road.',
    image: '/brand/og-default.png',
    mobileImage: '/placeholders/banners/switchgear-hero-mobile.svg',
    link: '/categories/circuit-breakers',
    ctaText: 'Browse Circuit Breakers',
    position: 'hero',
    displayOrder: 1,
  },
  {
    title: 'Automation Built Around Your Machine',
    subtitle:
      'PLCs, HMIs and VFDs from Mitsubishi, Schneider and Fuji — tell us the duty and we will quote the right drive.',
    image: '/brand/og-default.png',
    mobileImage: '/placeholders/banners/automation-hero-mobile.svg',
    link: '/categories/automation',
    ctaText: 'Send an Inquiry',
    position: 'hero',
    displayOrder: 2,
  },
  {
    title: 'Bulk & Trade Pricing for Panel Builders',
    subtitle: 'Send us your bill of materials and get a consolidated quote within one working day.',
    image: '/placeholders/banners/trade-strip.svg',
    link: '/submit-inquiry',
    ctaText: 'Send Your BOM',
    position: 'strip',
    displayOrder: 1,
  },
];
