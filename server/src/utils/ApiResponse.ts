import type { Response } from 'express';
import type { ApiResponse, Paginated } from '../types/api';

/**
 * Helpers that guarantee every endpoint emits the same envelope:
 *   { success, message, data }
 *
 * They write to the response rather than returning it — `res.json()` is typed
 * `any`, and returning that would leak an untyped value into controllers.
 */

/**
 * Is this a plain object, as opposed to a class instance?
 *
 * Mongoose documents, Dates, Buffers and ObjectIds all have their own
 * prototypes and their own serialisation. Only `.lean()` results and object
 * literals are walked.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Rename `_id` to `id`, recursively.
 *
 * A hydrated Mongoose document goes through `jsonTransform` on the way out, so
 * it arrives at the client with `id`. A `.lean()` result does **not** — lean
 * skips the schema entirely and hands back the raw driver document, `_id` and
 * all. Every admin list uses `.lean()` for the speed, so every admin list was
 * emitting `_id` while the client read `.id`: `/admin/inquiries/undefined`,
 * and a detail page stuck on its skeleton.
 *
 * Normalising here rather than in each controller is deliberate. There are
 * seven list endpoints and the next one would forget too — this is the single
 * point every response already passes through.
 */
/**
 * A lean `_id` is a real ObjectId, not a string. `toHexString` is the
 * documented accessor — `String()` on it would satisfy the compiler and
 * produce "[object Object]" for anything else that ever lands here.
 */
function toIdString(value: unknown): unknown {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toHexString' in value) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return value;
}

function normaliseIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normaliseIds);
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__v') continue;
    if (key === '_id') {
      out.id = toIdString(item);
      continue;
    }
    out[key] = normaliseIds(item);
  }
  return out;
}

export function sendSuccess<T>(
  res: Response,
  data: T | null,
  message = 'Success',
  statusCode = 200,
): void {
  const body: ApiResponse<T> = { success: true, message, data: normaliseIds(data) as T | null };
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
