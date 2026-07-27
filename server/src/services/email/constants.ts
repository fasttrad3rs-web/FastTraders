import { env } from '../../config/env';

/** Business details used in email footers and links. */
export const CONTACT = {
  address: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
} as const;

export const SITE = {
  name: 'Fast Traders',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  /** First whitelisted origin is the canonical public site. */
  url: env.CLIENT_URL[0] ?? 'https://www.fasttraders.co',
  domain: 'www.fasttraders.co',
} as const;

/** Format a PKR amount for email bodies. */
export function formatPKR(amount: number): string {
  return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
}
