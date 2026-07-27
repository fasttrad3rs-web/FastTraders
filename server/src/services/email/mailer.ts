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
  /** Generated PDFs (invoice, quotation) ride along here. */
  attachments?: MailAttachment[];
}

/** Await this only when the caller genuinely needs the delivery result. */
export async function sendEmail({ to, content, replyTo, attachments }: SendOptions): Promise<boolean> {
  const recipients = Array.isArray(to) ? to.join(', ') : to;

  if (isTest) {
    logger.debug(
      `[mail] suppressed in test: "${content.subject}" -> ${recipients}` +
        `${attachments?.length ? ` (+${attachments.length} attachment)` : ''}`,
    );
    return true;
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
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[mail] FAILED "${content.subject}" -> ${recipients}: ${message}`);
    return false;
  }
}

/**
 * Dispatch without blocking the response.
 * Every rejection is already swallowed inside `sendEmail`, so this can never
 * produce an unhandled rejection.
 */
export function dispatchEmail(options: SendOptions): void {
  void sendEmail(options);
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
