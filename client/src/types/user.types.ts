/**
 * User & identity types.
 * MIRRORED FILE — keep in sync with `server/src/types/user.types.ts`.
 * The client mirror intentionally omits every credential/secret field.
 */

export type UserRole = 'customer' | 'admin' | 'manager';

/** Pakistani provinces / territories, used for shipping address validation. */
export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
  'Islamabad Capital Territory',
] as const;

export type Province = (typeof PROVINCES)[number];

export interface Address {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  province: Province;
  postalCode?: string;
  isDefault: boolean;
}

/** Public-safe user projection returned by the API. */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  companyName?: string;
  /** National Tax Number — B2B invoicing. */
  ntn?: string;
  addresses: Address[];
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

/** Access/refresh token pair issued on login and refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
