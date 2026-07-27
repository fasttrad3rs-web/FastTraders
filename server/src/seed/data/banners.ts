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
 * Images point at a placeholder service so the storefront renders immediately;
 * replace them with the client's Cloudinary artwork before launch.
 */
export const banners: BannerSeed[] = [
  {
    title: 'Industrial Switchgear, In Stock in Lahore',
    subtitle:
      'Terasaki, Schneider Electric, Mitsubishi and Fuji circuit breakers ready for same-day collection from Bull Road.',
    image: 'https://placehold.co/1920x720/0F1B4C/FFFFFF/png?text=Switchgear+In+Stock',
    mobileImage: 'https://placehold.co/828x1000/0F1B4C/FFFFFF/png?text=Switchgear',
    link: '/category/circuit-breakers',
    ctaText: 'Browse Circuit Breakers',
    position: 'hero',
    displayOrder: 1,
  },
  {
    title: 'Automation Built Around Your Machine',
    subtitle:
      'PLCs, HMIs and VFDs from Mitsubishi, Schneider and Fuji — tell us the duty and we will quote the right drive.',
    image: 'https://placehold.co/1920x720/1B2A6B/00AEEF/png?text=PLC+HMI+VFD',
    mobileImage: 'https://placehold.co/828x1000/1B2A6B/00AEEF/png?text=Automation',
    link: '/category/control-automation',
    ctaText: 'Request a Quotation',
    position: 'hero',
    displayOrder: 2,
  },
  {
    title: 'Bulk & Trade Pricing for Panel Builders',
    subtitle: 'Send us your bill of materials and get a consolidated quote within one working day.',
    image: 'https://placehold.co/1920x300/00AEEF/0F1B4C/png?text=Bulk+%26+Trade+Pricing',
    link: '/request-quote',
    ctaText: 'Send Your BOM',
    position: 'strip',
    displayOrder: 1,
  },
];
