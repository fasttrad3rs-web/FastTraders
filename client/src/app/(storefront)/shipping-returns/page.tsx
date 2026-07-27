import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping & Returns',
  description:
    'Delivery times and charges across Pakistan, collection from our Lahore counter, and how to return an item.',
  path: '/shipping-returns',
  keywords: ['electrical parts delivery Lahore', 'cable supplier Lahore'],
});

export default function ShippingReturnsPage(): JSX.Element {
  return (
    <LegalPage
      title="Shipping & Returns"
      updated="July 2026"
      sections={[
        {
          heading: 'Delivery times and charges',
          body: [
            'Lahore: 1–2 working days. Elsewhere in Punjab: 2–4 working days. Rest of Pakistan: 3–6 working days.',
            'Delivery is charged by destination and is shown at checkout before you confirm. Free delivery applies above the order value thresholds configured in our system — these are displayed at checkout.',
            'Heavy or oversized items such as ACBs, transformers and full cable drums are quoted for freight separately.',
          ],
        },
        {
          heading: 'Collection',
          body: [
            'Same-day collection is available from our counter at Shop No. 30, Grace Tower, Bull Road, Lahore, Monday to Saturday, 10:00 to 19:00.',
            'Call +92 324 4234990 before you set off and we will have the goods ready.',
          ],
        },
        {
          heading: 'Checking your delivery',
          body: [
            'Please check the consignment on arrival. Report any shortage or transit damage within 48 hours, with photographs where possible, so we can raise it with the courier.',
          ],
        },
        {
          heading: 'Returns',
          body: [
            'Unused items in their original, unopened packaging can be returned within 7 days of delivery. The return carriage is at your cost unless the item was faulty or incorrectly supplied.',
            'Cut lengths of cable, special-order items and anything made or imported to order are non-returnable once confirmed.',
            'Refunds are issued by the original payment method, or by bank transfer for cash-on-delivery orders, within 7 working days of the goods being received back and inspected.',
          ],
        },
        {
          heading: 'Faulty goods',
          body: [
            'If an item fails within its warranty period, contact us with the order number and a description of the fault. We will arrange inspection and handle the manufacturer’s warranty process on your behalf.',
          ],
        },
      ]}
    />
  );
}
