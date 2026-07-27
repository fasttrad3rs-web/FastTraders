import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Building2, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/pagination';
import { SectionHeading } from '@/components/ui/separator';
import { JsonLd } from '@/components/shared/json-ld';
import { getBrands } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, localBusinessSchema, organizationSchema } from '@/lib/seo';
import { CONTACT } from '@/lib/constants';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'About Fast Traders — Industrial Equipment Supplier, Lahore',
  description:
    'Fast Traders supplies industrial and electrical equipment from Grace Tower, Bull Road, Lahore. Led by Sharjeel Bin Ejaz, authorised stockist for twelve manufacturers.',
  path: '/about',
  keywords: ['industrial equipment supplier Lahore', 'electrical components Pakistan'],
});

export default async function AboutPage(): Promise<JSX.Element> {
  const brands = await getBrands();

  return (
    <div>
      <JsonLd
        schemas={[organizationSchema(), localBusinessSchema(), breadcrumbSchema([{ name: 'About', path: '/about' }])]}
      />

      <section className="bg-brand-gradient text-white">
        <div className="container py-14">
          <Breadcrumb items={[{ label: 'About' }]} className="mb-4 [&_a]:text-white/60 [&_span]:text-white" />
          <h1 className="font-heading text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
            About Fast Traders
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            We deal in all kinds of industrial equipment, parts and accessories — supplying
            contractors, panel builders and factories across Pakistan from our counter in Lahore.
          </p>
        </div>
      </section>

      <section className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <SectionHeading title="Our story" />
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Fast Traders operates from Shop No. 30, Grace Tower on Bull Road — one of Lahore&rsquo;s
                established trading addresses for electrical and industrial supply. The business is
                led by <strong className="font-semibold text-brand-navy">Sharjeel Bin Ejaz</strong>.
              </p>
              <p>
                What began as a counter for circuit breakers and cable has grown into a full
                catalogue: switchgear and protection, control components, automation, power and
                motor control, safety products, and the tools and accessories that go with them.
              </p>
              <p>
                We are an authorised stockist for twelve manufacturers, which matters more here than
                it might elsewhere. Counterfeit and grey-import breakers are a real problem in this
                market; everything we sell comes through official channels and carries the
                manufacturer&rsquo;s warranty.
              </p>
              <p>
                Most of our work is repeat business with people who know exactly what they need —
                so we keep real stock on the shelf, answer the phone, and quote in writing.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { Icon: Building2, title: 'Where we are', body: CONTACT.address.full },
              { Icon: Users, title: 'Who we serve', body: 'Contractors, panel builders, factories, maintenance teams and consulting engineers.' },
              { Icon: Target, title: 'What we promise', body: 'Genuine product, honest stock information, and a written quotation within a working day.' },
              { Icon: Award, title: 'Authorisations', body: 'Stockist for twelve manufacturers across Japan, Germany, France, Korea, Turkey and Pakistan.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="flex gap-3 rounded-lg border border-border bg-white p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
                <div>
                  <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white py-14">
        <div className="container">
          <SectionHeading title="Our brand partners" description="Authorised stockist and supplier." />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(brands ?? []).map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex h-20 flex-col items-center justify-center rounded-lg border border-border bg-surface px-3 text-center text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:border-brand-cyan hover:text-brand-navy"
                >
                  {brand.name}
                  {brand.country ? (
                    <span className="mt-1 text-2xs font-normal normal-case text-muted-foreground">
                      {brand.country}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container py-14 text-center">
        <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy">
          Need something specific?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          If it is not on the site, ask — we source far more than the catalogue shows.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="cta" size="lg">
            <Link href="/request-quote">Request a quote</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
