import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProduction, isTest } from '../../config/env';
import { logger } from '../../config/logger';
import type { EmailContent } from './templates.auth';

/**
 * Nodemailer transport.
 *
 * Created lazily so importing this module never opens a socket (matters for
 * the seeder and for tests). Delivery is fire-and-forget: a failed email must
 * never fail the HTTP request that triggered it.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: 3,
    // Pakistani SMTP round trips can be slow; be patient before giving up.
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendOptions {
  to: string | string[];
  content: EmailContent;
  replyTo?: string;
  /** The generated quotation PDF rides along here. */
  attachments?: MailAttachment[];
}

/** Await this only when the caller genuinely needs the delivery result. */
export async function sendEmail(options: SendOptions): Promise<boolean> {
  return (await sendEmailWithReason(options)).ok;
}

/** As `sendEmail`, but reports the failure text so the queue can judge it. */
async function sendEmailWithReason({
  to,
  content,
  replyTo,
  attachments,
}: SendOptions): Promise<{ ok: boolean; reason: string }> {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (isTest) {
    logger.debug(
      `[mail] suppressed in test: "${content.subject}" -> ${recipients}` +
        `${attachments?.length ? ` (+${attachments.length} attachment)` : ''}`,
    );
    return { ok: true, reason: '' };
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: recipients,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    });
    logger.info(`[mail] sent "${content.subject}" -> ${recipients}`);
    return { ok: true, reason: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[mail] FAILED "${content.subject}" -> ${recipients}: ${message}`);
    return { ok: false, reason: message };
  }
}

/*
 * An outbound queue, because SMTP providers throttle.
 *
 * A single inquiry fires two emails at once — the alert to the shop and the
 * acknowledgement to the customer — and Mailtrap's free tier rejected the
 * second with `550 5.7.0 Too many emails per second`. Every provider does
 * some version of this; Gmail's limits are just further away, so in production
 * it would show up as an occasional missing acknowledgement rather than a
 * reliable one, which is harder to notice and worse to debug.
 *
 * Sends are therefore serialised with a small gap, and a throttle response is
 * retried rather than dropped. Nothing here blocks the HTTP response: the
 * queue is a detached promise chain.
 */
const MIN_GAP_MS = 1100;
const MAX_ATTEMPTS = 3;

let queue: Promise<void> = Promise.resolve();
let lastSentAt = 0;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Throttling and greylisting are temporary; a bad address is not. */
function isTransient(message: string): boolean {
  return /too many|rate limit|4\.7\.0|421|450|451|452|Too many emails/i.test(message);
}

async function sendWithRetry(options: SendOptions): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const gap = Date.now() - lastSentAt;
    if (gap < MIN_GAP_MS) await wait(MIN_GAP_MS - gap);

    const outcome = await sendEmailWithReason(options);
    lastSentAt = Date.now();

    if (outcome.ok) return;
    if (!isTransient(outcome.reason) || attempt === MAX_ATTEMPTS) return;

    // Linear backoff. The provider has told us to slow down, so do that
    // rather than hammering a second time immediately.
    logger.warn(
      `[mail] throttled, retrying (${attempt}/${MAX_ATTEMPTS - 1}): "${options.content.subject}"`,
    );
    await wait(MIN_GAP_MS * attempt);
  }
}

/**
 * Dispatch without blocking the response.
 * Every rejection is swallowed inside `sendEmail`, so this can never produce
 * an unhandled rejection.
 */
export function dispatchEmail(options: SendOptions): void {
  queue = queue.then(() => sendWithRetry(options));
}

/** Verify SMTP credentials at boot; logs a warning rather than crashing. */
export async function verifyMailer(): Promise<void> {
  if (isTest) return;
  try {
    await getTransporter().verify();
    logger.info('[mail] SMTP connection verified');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const level = isProduction ? 'error' : 'warn';
    logger[level](`[mail] SMTP verification failed — emails will not send: ${message}`);
  }
}
