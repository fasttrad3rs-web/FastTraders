import type { Response } from 'express';
import type { ApiResponse, Paginated } from '../types/api';

/**
 * Helpers that guarantee every endpoint emits the same envelope:
 *   { success, message, data }
 *
 * They write to the response rather than returning it — `res.json()` is typed
 * `any`, and returning that would leak an untyped value into controllers.
 */

export function sendSuccess<T>(
  res: Response,
  data: T | null,
  message = 'Success',
  statusCode = 200,
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T | null, message = 'Created successfully'): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response, message = 'Deleted successfully'): void {
  sendSuccess(res, null, message, 200);
}

/** Build the pagination envelope from a slice of results and a total count. */
export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
