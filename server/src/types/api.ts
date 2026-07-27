/**
 * API contract types.
 *
 * MIRRORED FILE — keep in sync with `client/src/types/api.ts`.
 */

/** Standard response envelope returned by every `/api/v1` endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/** Error payload attached to failed responses (validation errors, etc.). */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Shape of a non-2xx response body. */
export interface ApiErrorResponse extends ApiResponse<null> {
  success: false;
  errors?: ApiErrorDetail[];
  /** Present in non-production environments only. */
  stack?: string;
}

/** Envelope for paginated list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
