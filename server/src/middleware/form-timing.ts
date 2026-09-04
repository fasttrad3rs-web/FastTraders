import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { verifyFormToken } from '../utils/form-token';

/**
 * Rejects submissions that arrived impossibly fast.
 *
 * Like the honeypot, a caught request gets a **cheerful 201 with no payload
 * stored**. Telling a bot "you were too fast" tells its author precisely what
 * to change; a success response that quietly discards the submission gives
 * them nothing to tune against. Every drop is logged so a genuine false
 * positive is diagnosable.
 *
 * Missing token vs bad token are treated differently on purpose:
 *
 *   - **absent** → let it through. The token endpoint could be blocked by a
 *     corporate proxy, or an older cached bundle might not send one yet, and
 *     silently binning a real buyer's inquiry is far more expensive to this
 *     business than passing a little spam to the other layers. This is a
 *     defence in depth, not the wall.
 *   - **present but forged, replayed or too fast** → drop. Somebody who sends
 *     a token at all is speaking our protocol, so a broken one is a signal.
 */
export function formTiming(req: Request, _res: Response, next: NextFunction): void {
  const body = req.body as Record<string, unknown> | undefined;
  const token = body?.formToken;

  if (token === undefined || token === null || token === '') {
    next();
    return;
  }

  const verdict = verifyFormToken(token);

  if (verdict.ok) {
    // Keep the field out of the validated payload; nothing downstream wants it.
    if (body) delete body.formToken;
    next();
    return;
  }

  logger.warn(
    `[form-timing] Discarded a submission to ${req.originalUrl} from ${req.ip ?? 'unknown'} ` +
      `(reason=${verdict.reason})`,
  );

  _res.status(201).json({
    success: true,
    message: 'Thank you. We will be in touch shortly.',
    data: null,
  });
}
