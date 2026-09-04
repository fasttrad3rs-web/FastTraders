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
/*
 * These four lead deliberately: they are the questions the catalogue-only
 * model creates, and the ones a buyer asks before ringing. The set that used
 * to be here described online payment, guest checkout and a returns window —
 * all of which stopped being true at the pivot, and any one of which would
 * have been a lie in the search results via FAQPage markup.
 */
const FAQS = [
  {
    question: 'How do I get a price?',
    answer:
      'Call us on 0324 4234990, message the same number on WhatsApp, or add what you need to your inquiry list and send it. We quote on the phone because the right price depends on quantity, current stock and the exchange rate on imported items — a fixed number on a web page would be out of date within a week.',
  },
  {
    question: 'Do you deliver outside Lahore?',
    answer:
      'Yes, anywhere in Pakistan. Lahore is usually 1–2 working days and same-day collection is available from our counter at Grace Tower, Bull Road. Elsewhere in Punjab is typically 2–4 working days and the rest of the country 3–6, by the courier that suits the consignment.',
  },
  {
    question: 'Can you import a specific brand or model?',
    answer:
      'Often, yes — sourcing from China to order is a real part of what we do. Send the part number, or a photo of the rating plate if the unit has failed, through the Source From China form or on WhatsApp. We will tell you honestly whether we can get it, from where, and how long it takes.',
  },
  {
    question: 'Are your products genuine?',
    answer:
      'Yes. We are an authorised stockist for the brands listed on this site and source only through official channels. Counterfeit breakers are a real problem in this market, which is why every item we supply carries the manufacturer’s warranty.',
  },
  {
    question: 'Why are there no prices on the website?',
    answer:
      'Because a published price for this kind of equipment is nearly always wrong. Switchgear and automation pricing moves with specification, quantity, supplier stock and the rupee. Quoting you directly means the number you get is the number that holds.',
  },
  {
    question: 'Do you offer trade or bulk pricing?',
    answer:
      'Yes. Send your bill of materials through the inquiry list and we will come back with one consolidated quotation. We work regularly with contractors, panel builders and factory maintenance teams.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. There are no customer accounts on this site. Build an inquiry list, send it with your name and number, and we will call you back — nothing to register for and no password to forget.',
  },
  {
    question: 'What if something arrives damaged or wrong?',
    answer:
      'Tell us within 48 hours of delivery and we will sort it out. Unused items in original packaging can be returned within 7 days. Special-order and imported items are confirmed with you before we commit, so please check the specification carefully at that point.',
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
            <Link href="/submit-inquiry">Request a quote</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
