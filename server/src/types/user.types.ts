/**
 * Staff identity types.
 * MIRRORED FILE — keep in sync with `client/src/types/user.types.ts`.
 * The client mirror intentionally omits every credential/secret field.
 *
 * There is no customer identity. A buyer is represented by the
 * `customer` block captured on an inquiry, not by an account.
 */

export type UserRole = 'admin' | 'manager';

/** Public-safe user projection returned by the API. */
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
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
