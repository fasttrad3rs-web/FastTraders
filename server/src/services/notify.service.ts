import { env } from '../config/env';
import { logger } from '../config/logger';
import type { InquiryDocument } from '../models';

/**
 * WhatsApp/SMS alert to the shop, behind a feature flag.
 *
 * Optional by design, and the app must run without it. Email is the guaranteed
 * channel; this is the one that actually gets read within the hour, because
 * the counter phone is in somebody's hand and the inbox is not.
 *
 * No `twilio` package. The REST call is one `fetch` with basic auth, and
 * adding a dependency — plus its transitive tree — to a deployment that may
 * never enable the feature is a poor trade. If this grows to cover delivery
 * receipts or two-way replies, swap it for the SDK then.
 *
 * Required credentials, all optional, documented in README.md:
 *   TWILIO_ACCOUNT_SID   ACxxxxxxxx from the Twilio console
 *   TWILIO_AUTH_TOKEN    the paired auth token
 *   TWILIO_FROM          `whatsapp:+14155238886` (sandbox) or an SMS number
 *   TWILIO_ALERT_TO      defaults to the shop mobile
 */

export const isSmsAlertEnabled = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);

let announced = false;
function announceOnce(): void {
  if (announced) return;
  announced = true;
  logger.info(
    isSmsAlertEnabled()
      ? `[notify] Twilio alerts enabled -> ${env.TWILIO_ALERT_TO}`
      : '[notify] Twilio not configured; inquiry alerts go by email only',
  );
}

/** WhatsApp needs the `whatsapp:` prefix on both ends, SMS needs it on neither. */
function matchChannel(to: string, from: string): string {
  const wantsWhatsApp = from.startsWith('whatsapp:');
  const hasPrefix = to.startsWith('whatsapp:');
  if (wantsWhatsApp && !hasPrefix) return `whatsapp:${to}`;
  if (!wantsWhatsApp && hasPrefix) return to.replace(/^whatsapp:/, '');
  return to;
}

/** Short enough for one SMS segment where possible; the detail is in the email. */
function composeAlert(inquiry: InquiryDocument): string {
  const { customer, type } = inquiry;
  const kind = type === 'sourcing_request' ? 'SOURCING' : 'INQUIRY';
  const company = customer.company ? ` (${customer.company})` : '';

  return [
    `${kind} ${inquiry.inquiryNumber}`,
    `${customer.name}${company}`,
    customer.phone,
    inquiry.sourcingDetails?.itemDescription?.slice(0, 90) ??
      `${inquiry.items.length} item(s) shortlisted`,
  ].join('\n');
}

/**
 * Fire and forget.
 *
 * Never awaited by the request path and never throws: a Twilio outage must not
 * turn a customer's successful enquiry into an error page. A failure is logged
 * and the email still went.
 */
export function alertShop(inquiry: InquiryDocument): void {
  announceOnce();
  if (!isSmsAlertEnabled()) return;

  const sid = env.TWILIO_ACCOUNT_SID as string;
  const token = env.TWILIO_AUTH_TOKEN as string;
  const from = env.TWILIO_FROM as string;

  const body = new URLSearchParams({
    To: matchChannel(env.TWILIO_ALERT_TO, from),
    From: from,
    Body: composeAlert(inquiry),
  });

  void fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(8000),
  })
    .then(async (response) => {
      if (!response.ok) {
        logger.error(`[notify] Twilio ${response.status}: ${(await response.text()).slice(0, 200)}`);
        return;
      }
      logger.info(`[notify] Alerted the shop about ${inquiry.inquiryNumber}`);
    })
    .catch((error: unknown) => {
      logger.error(`[notify] Twilio request failed: ${String(error)}`);
    });
}
