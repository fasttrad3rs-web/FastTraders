import type { NextFunction, Request, Response } from 'express';

/**
 * NoSQL-injection guard.
 *
 * Mongo treats `{ email: { $ne: null } }` as an operator, so a JSON body of
 * `{"email": {"$ne": null}}` would otherwise match any user. This strips every
 * key that begins with `$` or contains a `.` from the body, query and params
 * before a controller can see it.
 *
 * Runs after the JSON parser and before validation.
 */

const FORBIDDEN_KEY = /^\$|\./;

function scrub(value: unknown, removed: string[], depth = 0): unknown {
  // Guard against deeply nested payloads crafted to burn CPU.
  if (depth > 10) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, removed, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      if (FORBIDDEN_KEY.test(key)) {
        removed.push(key);
        continue;
      }
      clean[key] = scrub(item, removed, depth + 1);
    }
    return clean;
  }

  return value;
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  const removed: string[] = [];

  if (req.body && typeof req.body === 'object') {
    req.body = scrub(req.body, removed);
  }

  if (Object.keys(req.query).length > 0) {
    // `req.query` is getter-only in newer Express; redefine rather than assign.
    Object.defineProperty(req, 'query', {
      value: scrub(req.query, removed),
      writable: true,
      configurable: true,
    });
  }

  if (Object.keys(req.params).length > 0) {
    req.params = scrub(req.params, removed) as typeof req.params;
  }

  // Surface the attempt for the audit trail without failing the request.
  if (removed.length > 0) {
    req.sanitizedKeys = removed;
  }

  next();
}
