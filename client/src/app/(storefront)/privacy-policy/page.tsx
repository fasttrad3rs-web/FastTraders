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
            'When you place an order or request a quotation we collect your name, email address, phone number, delivery address and, if you provide them, your company name and NTN.',
            'If you create an account we also store a hashed version of your password. We never store the password itself, and we cannot recover it.',
            'We record which products you view and add to your cart so the site can show your recently viewed items and keep your cart between visits.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'To fulfil orders, price quotations, arrange delivery and provide after-sales support.',
            'To send transactional email — order confirmations, status updates and quotations. These are not marketing and cannot be unsubscribed from while an order is active.',
            'To send occasional product and stock updates, but only if you subscribed to the newsletter. Every such email carries an unsubscribe link.',
          ],
        },
        {
          heading: 'Payment information',
          body: [
            'We do not see or store card numbers. Card payments are processed by Stripe, who handle the card data directly under their own privacy terms.',
            'For bank transfers we only see what appears on the transfer receipt you send us.',
          ],
        },
        {
          heading: 'Who we share it with',
          body: [
            'Courier companies, so they can deliver your order — name, address and phone number only.',
            'Our payment processor and email provider, as needed to take payment and send transactional email.',
            'We do not sell your data, and we do not share it for advertising.',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'We use a small number of essential cookies: an authentication cookie if you are signed in, and a session cookie so a guest cart survives a page reload. Both are httpOnly and cannot be read by scripts.',
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
