import { SITE } from './constants';
import { renderEmail } from './layout';

/** Account lifecycle emails: welcome, address verification, password reset. */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(name: string): EmailContent {
  const subject = 'Welcome to Fast Traders';
  return {
    subject,
    html: renderEmail({
      title: `Welcome, ${name}`,
      preheader: 'Your Fast Traders account is ready.',
      body: `<p>Thank you for creating an account with Fast Traders.</p>
        <p>You can now track your orders, save delivery addresses and send us a
        request for quotation straight from your inquiry cart — handy when you
        are pricing a full panel build.</p>
        <p>Need something urgently? WhatsApp us on <strong>+92 324 4234990</strong>
        and we will check stock at the Bull Road counter for you.</p>`,
      cta: { label: 'Browse the catalogue', url: `${SITE.url}/products` },
    }),
    text: `Welcome, ${name}. Your Fast Traders account is ready. Browse the catalogue at ${SITE.url}/products or WhatsApp +92 324 4234990.`,
  };
}

export function verifyEmail(name: string, token: string): EmailContent {
  const url = `${SITE.url}/verify-email/${token}`;
  return {
    subject: 'Verify your email address',
    html: renderEmail({
      title: 'Confirm your email address',
      preheader: 'One click to verify your Fast Traders account.',
      body: `<p>Hello ${name},</p>
        <p>Please confirm this email address so we can send you order updates
        and quotations.</p>
        <p style="font-size:13px;color:#5A6472;">This link expires in 24 hours.
        If you did not create a Fast Traders account, you can ignore this email.</p>`,
      cta: { label: 'Verify email address', url },
    }),
    text: `Hello ${name}, confirm your Fast Traders email address: ${url} (expires in 24 hours).`,
  };
}

export function resetPasswordEmail(name: string, token: string): EmailContent {
  const url = `${SITE.url}/reset-password/${token}`;
  return {
    subject: 'Reset your Fast Traders password',
    html: renderEmail({
      title: 'Reset your password',
      preheader: 'A password reset was requested for your account.',
      body: `<p>Hello ${name},</p>
        <p>We received a request to reset the password on your Fast Traders
        account. Use the button below to choose a new one.</p>
        <p style="font-size:13px;color:#5A6472;">This link expires in 30 minutes
        and can only be used once. If you did not request a reset, no action is
        needed — your password has not changed.</p>`,
      cta: { label: 'Choose a new password', url },
    }),
    text: `Hello ${name}, reset your Fast Traders password: ${url} (expires in 30 minutes). If you did not request this, ignore this email.`,
  };
}

export function passwordChangedEmail(name: string): EmailContent {
  return {
    subject: 'Your Fast Traders password was changed',
    html: renderEmail({
      title: 'Password changed',
      preheader: 'Confirmation that your password was updated.',
      body: `<p>Hello ${name},</p>
        <p>The password on your Fast Traders account was just changed, and every
        other signed-in device has been logged out.</p>
        <p><strong>If this was not you</strong>, contact us immediately on
        +92 324 4234990 or reply to this email.</p>`,
    }),
    text: `Hello ${name}, your Fast Traders password was changed and other sessions were signed out. If this was not you, call +92 324 4234990.`,
  };
}
