import type { Metadata } from 'next';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { breadcrumbSchema, buildMetadata, faqSchema } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Delivery, payment, warranty, trade pricing and stock questions answered — Fast Traders, Lahore.',
  path: '/faq',
});

/** Single source for both the rendered accordion and the FAQPage schema. */
const FAQS = [
  {
    question: 'Are your products genuine?',
    answer:
      'Yes. We are an authorised stockist for all twelve brands listed on the site and source only through official channels. Counterfeit breakers are a real problem in this market, which is why every item carries the manufacturer’s warranty.',
  },
  {
    question: 'Why do some products show a price and others say "price on request"?',
    answer:
      'Standard stock items are priced and can be bought online. Larger switchgear, automation and made-to-order items depend on specification, exchange rate and lead time, so we quote those individually. Add them to your inquiry list and we will price them, usually within one working day.',
  },
  {
    question: 'Do you offer trade or bulk pricing?',
    answer:
      'Yes. Send your bill of materials through the Request a Quote page and we will come back with one consolidated quotation. We work regularly with contractors, panel builders and factory maintenance teams.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Lahore is 1–2 working days, elsewhere in Punjab 2–4, and the rest of Pakistan 3–6. Free delivery applies above the thresholds shown at checkout. Same-day collection is available from our counter at Grace Tower, Bull Road.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Cash on delivery, bank transfer, and card payment through Stripe. JazzCash and Easypaisa are planned. For bank transfer we send the account details with your order confirmation.',
  },
  {
    question: 'Can I order without creating an account?',
    answer:
      'Yes — guest checkout is available for both orders and quotation requests. You can track a guest order with the order number and the email you used at checkout.',
  },
  {
    question: 'What is your returns policy?',
    answer:
      'Report shortages or transit damage within 48 hours of delivery. Unused items in original packaging can be returned within 7 days. Special-order and made-to-order items are non-returnable once confirmed.',
  },
  {
    question: 'Do you supply items that are not on the website?',
    answer:
      'Often, yes. The site shows a portion of what we can source. Send the part number or a photo of the rating plate on WhatsApp and we will tell you whether we can get it.',
  },
] as const;

export default function FaqPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd
        schemas={[faqSchema([...FAQS]), breadcrumbSchema([{ name: 'FAQ', path: '/faq' }])]}
      />

      <Breadcrumb items={[{ label: 'FAQ' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Frequently Asked Questions
      </h1>

      <div className="mt-6 max-w-3xl rounded-lg border border-border bg-white px-6">
        <Accordion type="single" collapsible defaultValue="q0">
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`q${index}`} className="last:border-b-0">
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="mt-8 max-w-3xl rounded-lg border border-border bg-surface p-6 text-center">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Still have a question?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Call +92 324 4234990 or send us a message — we answer six days a week.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild variant="cta" size="sm">
            <Link href="/contact">Contact us</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/request-quote">Request a quote</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
