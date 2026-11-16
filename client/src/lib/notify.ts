import { env } from './env';

/**
 * Enquiry notifications via EmailJS.
 *
 * ## Why this exists alongside the server's own mailer
 *
 * The API already sends alerts through Nodemailer. This is a second,
 * browser-side notification that does not depend on SMTP credentials living
 * in the server's environment.
 *
 * ## The rule this file must never break
 *
 * **It runs only after the API call has succeeded**, never instead of it.
 * The API is what writes the Contact or Inquiry to MongoDB — that record is
 * the lead. A notification is a convenience; losing one costs an email, and
 * losing the record costs a customer. So every caller does the real
 * submission first and treats this as an afterthought, which is precisely
 * what it is.
 *
 * ## Consequences of that ordering
 *
 * - It never throws. A rejected promise here must not turn a successful
 *   submission into an error on the customer's screen.
 * - It is not awaited. The confirmation renders immediately; the email
 *   catches up.
 * - It is feature-flagged. With no keys configured — local development, CI,
 *   a preview build — it returns silently and the app behaves normally.
 *
 * ## On the keys being public
 *
 * All three are `NEXT_PUBLIC_*` and compiled into the browser bundle. That is
 * how EmailJS is designed to work and they are safe to expose, but it does
 * mean the abuse protection is EmailJS's domain allowlist rather than
 * anything secret. Set the allowed origins in the EmailJS dashboard to
 * fasttraders.co, or the quota is anybody's to spend.
 */

const ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/** Shape the template expects. Keys must match the `{{…}}` names exactly. */
export interface EnquiryNotification {
  subject: string;
  from_name: string;
  from_phone: string;
  from_email: string;
  company: string;
  message: string;
  /** Free-text block beneath the message — items, specs, whatever fits. */
  details: string;
  admin_link: string;
}

function configured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
      env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID &&
      env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
  );
}

/**
 * Fire a notification. Never awaited, never throws, never blocks the caller.
 *
 * Called with `void notifyEnquiry(...)` so the intent is visible at the call
 * site: we are not waiting, and we do not care whether it worked.
 */
export function notifyEnquiry(params: EnquiryNotification): void {
  if (!configured()) return;

  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      template_id: env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
      user_id: env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
      // Blank rather than absent: an unmatched `{{var}}` renders as the literal
      // braces in the email, which looks broken to whoever opens it.
      template_params: { ...EMPTY, ...params },
    }),
    // The site must stay usable on a stalled third party.
    signal: AbortSignal.timeout(8000),
  })
    .then((response) => {
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[notify] EmailJS answered ${response.status}`);
      }
    })
    .catch(() => {
      // Deliberately silent. The lead is already saved; the operator sees it
      // in Admin regardless, and a console error here would only alarm.
    });
}

const EMPTY: EnquiryNotification = {
  subject: '',
  from_name: '',
  from_phone: '',
  from_email: '',
  company: '',
  message: '',
  details: '',
  admin_link: '',
};

/** Absolute URL into the admin, so the email's button works from a phone. */
export function adminLink(path: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}${path}`;
}
