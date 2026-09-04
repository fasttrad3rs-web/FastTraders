import { SITE } from './constants';
import { renderEmail } from './layout';

/**
 * Staff account emails.
 *
 * No welcome and no address-verification mail — nobody signs themselves up,
 * and an admin who creates an account hands over the password in person.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function resetPasswordEmail(name: string, token: string): EmailContent {
  const url = `${SITE.url}/admin/reset-password/${token}`;
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
