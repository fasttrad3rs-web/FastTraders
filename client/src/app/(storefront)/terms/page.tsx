import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Terms & Conditions',
  description: 'Terms governing purchases and quotations from Fast Traders, Lahore.',
  path: '/terms',
});

export default function TermsPage(): JSX.Element {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="July 2026"
      sections={[
        {
          heading: 'About us',
          body: [
            'These terms apply to purchases from Fast Traders, Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan.',
          ],
        },
        {
          heading: 'Orders',
          body: [
            'An order placed on this site is an offer to buy. It is accepted when we confirm it — normally within one working day.',
            'We may decline an order if the item is no longer available, if a price has been listed in error, or if we cannot verify the delivery details.',
            'Prices are in Pakistani Rupees and include sales tax where applicable. Delivery is charged separately and shown before you confirm.',
          ],
        },
        {
          heading: 'Quotations',
          body: [
            'A quotation is valid for the period stated on it, and for 15 days if no period is given.',
            'Quoted prices are subject to stock availability at the time the order is confirmed. Imported items are quoted against the prevailing exchange rate and may be revised if it moves materially before the order is placed.',
            'Delivery lead time is confirmed on receipt of a firm order.',
          ],
        },
        {
          heading: 'Payment',
          body: [
            'We accept cash on delivery, bank transfer and card payment via Stripe.',
            'Goods remain the property of Fast Traders until payment is received in full.',
          ],
        },
        {
          heading: 'Warranty',
          body: [
            'Warranty is limited to the manufacturer’s terms for the brand concerned. We are an authorised stockist and will handle a valid warranty claim on your behalf.',
            'Warranty does not cover damage from incorrect installation, over-voltage, water ingress or use outside the product’s rated conditions.',
          ],
        },
        {
          heading: 'Liability',
          body: [
            'Our liability for any claim is limited to the value of the goods supplied. We are not liable for consequential loss, including loss of production.',
            'Nothing in these terms limits liability that cannot be limited under Pakistani law.',
          ],
        },
      ]}
    />
  );
}
