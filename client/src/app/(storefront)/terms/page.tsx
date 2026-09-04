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
          heading: 'Inquiries',
          body: [
            'Nothing on this site is an offer to sell and nothing can be bought here. Sending an inquiry asks us for a quote; it commits neither side to anything.',
            'We will normally call you back within one working day. A sourcing or import request may take one to two, because a supplier has to be checked first.',
            'A sale is agreed separately — on the phone, on WhatsApp or at our counter — and is subject to the quotation terms below.',
          ],
        },
        {
          heading: 'Quotations',
          body: [
            'A quotation is valid for the period stated when we give it, and for 15 days if no period is given.',
            'All quotes are in Pakistani Rupees and include sales tax where applicable, unless we say otherwise at the time.',
            'Quoted amounts are subject to stock at the moment the order is confirmed. Imported items are quoted against the prevailing exchange rate and may be revised if it moves materially before you place the order.',
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
