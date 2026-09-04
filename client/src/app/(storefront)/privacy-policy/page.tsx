import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Fast Traders collects, uses and protects your personal information.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'What we collect',
          body: [
            'When you send an inquiry or a China sourcing request we collect your name and phone number, and — only if you give them — your WhatsApp number, email address, company, city and role.',
            'There are no customer accounts on this site, so there is no password to store and nothing to sign in to.',
            'Your inquiry list is kept in your own browser. We only receive it at the moment you press send.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To answer your inquiry — to call or message you back with availability, lead time and a price, and to arrange delivery or collection.',
            'To send you a copy of your inquiry by email, if you gave us an address. This is not marketing.',
            'To send occasional product and stock updates, but only if you subscribed to the newsletter. Every such email carries an unsubscribe link.',
          ],
        },
        {
          heading: 'Payment information',
          body: [
            'None is collected here. Nothing is paid through this website — every transaction is settled at our counter or by bank transfer, arranged directly with you.',
          ],
        },
        {
          heading: 'Who we share it with',
          body: [
            'Courier companies, so they can deliver goods you have bought — name, address and phone number only.',
            'Our email provider, only to deliver a copy of your inquiry to you.',
            'We do not sell your data, and we do not share it for advertising.',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'One essential cookie: a session identifier so your inquiry list survives a page reload. It is httpOnly and cannot be read by scripts. Staff signing in to the admin area get an authentication cookie; customers never do, because there is nothing to sign in to.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You can view and correct your details in your account, or ask us to delete your account entirely. Order records are retained for tax and warranty purposes.',
          ],
        },
      ]}
    />
  );
}
