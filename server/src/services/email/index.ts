import { env } from '../../config/env';
import { dispatchEmail } from './mailer';
import {
  passwordChangedEmail,
  resetPasswordEmail,
  verifyEmail,
  welcomeEmail,
} from './templates.auth';
import {
  contactAlertEmail,
  newOrderAlertEmail,
  newQuotationAlertEmail,
  orderConfirmationEmail,
  orderStatusEmail,
  quotationReadyEmail,
  quotationReceivedEmail,
  type OrderEmailData,
  type QuotationEmailData,
} from './templates.commerce';

/**
 * Typed façade over the mail templates.
 * Controllers call these and move on — nothing here blocks a response.
 */
export const email = {
  welcome: (to: string, name: string): void =>
    dispatchEmail({ to, content: welcomeEmail(name) }),

  verifyAddress: (to: string, name: string, token: string): void =>
    dispatchEmail({ to, content: verifyEmail(name, token) }),

  resetPassword: (to: string, name: string, token: string): void =>
    dispatchEmail({ to, content: resetPasswordEmail(name, token) }),

  passwordChanged: (to: string, name: string): void =>
    dispatchEmail({ to, content: passwordChangedEmail(name) }),

  orderConfirmation: (to: string, data: OrderEmailData): void =>
    dispatchEmail({ to, content: orderConfirmationEmail(data) }),

  orderStatus: (
    to: string,
    data: {
      orderNumber: string;
      customerName: string;
      status: string;
      note?: string;
      trackingNumber?: string;
      courier?: string;
    },
  ): void => dispatchEmail({ to, content: orderStatusEmail(data) }),

  newOrderAlert: (
    data: OrderEmailData & { customerPhone: string; customerEmail: string },
  ): void =>
    dispatchEmail({
      to: env.ADMIN_EMAIL,
      content: newOrderAlertEmail(data),
      replyTo: data.customerEmail,
    }),

  quotationReceived: (to: string, data: QuotationEmailData): void =>
    dispatchEmail({ to, content: quotationReceivedEmail(data) }),

  quotationReady: (
    to: string,
    data: QuotationEmailData & { total: number; validUntil?: string },
  ): void => dispatchEmail({ to, content: quotationReadyEmail(data) }),

  newQuotationAlert: (
    data: QuotationEmailData & { customerPhone: string; customerEmail: string; company?: string },
  ): void =>
    dispatchEmail({
      to: env.ADMIN_EMAIL,
      content: newQuotationAlertEmail(data),
      replyTo: data.customerEmail,
    }),

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
export type { OrderEmailData, QuotationEmailData } from './templates.commerce';
