import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * reCAPTCHA v3, behind a feature flag.
 *
 * Off unless `RECAPTCHA_SECRET_KEY` is set, and when off every submission
 * passes. That is the right default for this business: the honeypot and a
 * 3/hour rate limit already carry the load, and a shop that stops taking
 * enquiries because a key expired has a worse problem than spam.
 *
 * v3 returns a score rather than a challenge, so a low score is never shown to
 * the customer as a failure — a real buyer on a shared office IP can score
 * badly through no fault of their own. Below the threshold the request is
 * still recorded; it is flagged for staff instead of refused.
 */

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const isRecaptchaEnabled = (): boolean => Boolean(env.RECAPTCHA_SECRET_KEY);

let announced = false;
function announceOnce(): void {
  if (announced) return;
  announced = true;
  logger.info(
    isRecaptchaEnabled()
      ? '[recaptcha] Enabled — scoring public form submissions'
      : '[recaptcha] Not configured; relying on the honeypot and rate limit',
  );
}

export interface RecaptchaVerdict {
  /** False only when a configured reCAPTCHA actively rejected the token. */
  ok: boolean;
  score?: number;
  /** True when the score was below the threshold but the request is kept. */
  suspicious: boolean;
}

interface SiteVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(
  token: string | undefined,
  remoteIp?: string,
): Promise<RecaptchaVerdict> {
  announceOnce();

  const secret = env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, suspicious: false };

  if (!token) {
    // Configured but no token: the script failed to load, or it is a bot.
    // Let it through and flag it — losing a real enquiry costs more.
    logger.warn('[recaptcha] Submission carried no token');
    return { ok: true, suspicious: true };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5000),
    });

    const result = (await response.json()) as SiteVerifyResponse;

    if (!result.success) {
      logger.warn(`[recaptcha] Rejected: ${(result['error-codes'] ?? []).join(', ') || 'unknown'}`);
      return { ok: false, suspicious: true };
    }

    const score = result.score ?? 0;
    return { ok: true, score, suspicious: score < env.RECAPTCHA_MIN_SCORE };
  } catch (error) {
    // Google being unreachable must not take the form down with it.
    logger.error(`[recaptcha] Verification failed, allowing through: ${String(error)}`);
    return { ok: true, suspicious: false };
  }
}
