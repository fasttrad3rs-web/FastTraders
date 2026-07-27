import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assign a correlation id to every request so a log line can be traced back to
 * the exact client call. Honours an inbound `X-Request-Id` when present.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const id = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
