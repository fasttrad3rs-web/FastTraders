import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Unpack a JSON payload sent alongside files in a multipart request.
 *
 * The sourcing form has nested shape — `customer.phone`, `sourcingDetails.
 * quantity` — and multipart carries flat strings with no types. Reconstructing
 * that from twenty bracket-notation field names means a second, hand-written
 * schema that drifts from the Zod one, and coercing `"3"` and `"false"` back
 * by hand at every field.
 *
 * So the client sends one `payload` part containing the same JSON body it
 * would have posted without files, and the files alongside it. One schema
 * validates both paths, and a request with no attachments needs no multipart
 * at all — which is why this is a no-op on a normal JSON body rather than a
 * requirement.
 */
export function multipartJson(field = 'payload') {
  return function parsePayload(req: Request, _res: Response, next: NextFunction): void {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      next();
      return;
    }

    const body = req.body as Record<string, unknown>;
    const raw = body[field];

    if (typeof raw !== 'string') {
      next(ApiError.badRequest(`Multipart submissions must include a JSON "${field}" field`));
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        next(ApiError.badRequest(`"${field}" must be a JSON object`));
        return;
      }
      req.body = parsed;
      next();
    } catch {
      // The message says nothing about what was malformed: this endpoint is
      // unauthenticated, and a parser error is a fingerprinting surface.
      next(ApiError.badRequest(`"${field}" is not valid JSON`));
    }
  };
}
