import { env } from '../../config/env';
import { dispatchEmail } from './mailer';
import { passwordChangedEmail, resetPasswordEmail } from './templates.auth';
import {
  adminInquiryUrl,
  contactAlertEmail,
  inquiryReceivedEmail,
  newInquiryAlertEmail,
} from './templates.notifications';
import type { InquiryDocument } from '../../models';

/**
 * Typed façade over the mail templates.
 * Controllers call these and move on — nothing here blocks a response.
 *
 * Four templates, down from thirteen. The nine that went belonged to an order
 * lifecycle and a customer account that no longer exist.
 */
export const email = {
  resetPassword: (to: string, name: string, token: string): void =>
    dispatchEmail({ to, content: resetPasswordEmail(name, token) }),

  passwordChanged: (to: string, name: string): void =>
    dispatchEmail({ to, content: passwordChangedEmail(name) }),

  /**
   * The one that matters. Every new inquiry lands in the shop inbox with the
   * customer's number one tap away, and `replyTo` set so hitting reply in any
   * mail client goes to the buyer rather than back to us.
   */
  newInquiryAlert: (inquiry: InquiryDocument): void =>
    dispatchEmail({
      to: env.ADMIN_EMAIL,
      content: newInquiryAlertEmail(inquiry, adminInquiryUrl(inquiry._id.toHexString())),
      ...(inquiry.customer.email ? { replyTo: inquiry.customer.email } : {}),
    }),

  /** Only called when the customer actually gave an address. */
  inquiryReceived: (to: string, inquiry: InquiryDocument): void =>
    dispatchEmail({ to, content: inquiryReceivedEmail(inquiry) }),

  contactAlert: (data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    source: string;
  }): void =>
    dispatchEmail({ to: env.ADMIN_EMAIL, content: contactAlertEmail(data), replyTo: data.email }),
} as const;

export { sendEmail, dispatchEmail, verifyMailer, type MailAttachment, type SendOptions } from './mailer';
export type { EmailContent } from './templates.auth';
