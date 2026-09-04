import type { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

/**
 * Honeypot guard for unauthenticated write endpoints.
 *
 * The form renders a `website` input hidden from humans by CSS and marked
 * `tabindex="-1"` / `autocomplete="off"`. A person never fills it. A bot that
 * walks the DOM filling every input does.
 *
 * **It answers 201, not 400.** Telling a scraper it was caught is telling it
 * how to get through next time; a success response that quietly discards the
 * payload costs the operator nothing and gives the author no signal. The hit
 * is logged so a genuine false positive is diagnosable — if a password
 * manager ever starts auto-filling this field, the log is where that shows up.
 *
 * This is not a serious defence on its own. It is free, invisible, and stops
 * the bulk of drive-by spam without putting a captcha in front of a buyer.
 */

const HONEYPOT_FIELD = 'website';

export function honeypot(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[HONEYPOT_FIELD];

  if (typeof value === 'string' && value.trim().length > 0) {
    logger.warn(
      `[honeypot] Discarded a submission to ${req.originalUrl} from ${req.ip ?? 'unknown'} ` +
        `(field="${value.slice(0, 40)}")`,
    );

    res.status(201).json({
      success: true,
      message: 'Thank you. We will be in touch shortly.',
      data: null,
    });
    return;
  }

  next();
}
