import type { Metadata } from 'next';
import { Globe, Phone, Search, Truck } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { SourcingForm } from '@/components/sourcing/sourcing-form';
import { ChinaFlag, ContactCard } from '@/components/shared';
import { getProduct } from '@/lib/api/catalog';
import { buildMetadata } from '@/lib/seo';

/**
 * "Can't find it? We import to order."
 *
 * The catalogue is a sample of what Fast Traders can supply, not the limit of
 * it — sourcing and importing to order is a real part of the business. This
 * page turns "not in stock" from a dead end into a lead.
 *
 * Indexed, unlike `/submit-inquiry`: "where to buy <obsolete part number> in
 * Lahore" is exactly the search this page should answer.
 */
export const metadata: Metadata = buildMetadata({
  title: 'Source From China — Tell Us What You Need',
  description:
    'Cannot find the part? Fast Traders sources industrial and electrical equipment from China to order — obsolete breakers, specific brands, hard-to-find ratings. Send a part number or a photo of the nameplate and we will find it.',
  path: '/source-from-china',
  keywords: [
    'source electrical equipment from China',
    'import industrial parts from China to Pakistan',
    'China sourcing agent Lahore',
    'import electrical equipment Pakistan',
    'obsolete circuit breaker replacement',
    'hard to find electrical parts Pakistan',
  ],
});

const STEPS = [
  {
    Icon: Search,
    title: 'Tell us what you need',
    body: 'A nameplate photo, a part number, or just the rating and the application. Whatever you have is enough to start.',
  },
  {
    Icon: Globe,
    title: 'We source it from China',
    body: 'Through the supplier network we buy from directly. Where an item is on our own shelves or comes from the manufacturer instead, we tell you that honestly.',
  },
  {
    Icon: Phone,
    title: 'We quote with lead time',
    body: 'Including alternatives, if a different brand or rating would do the same job sooner or for less.',
  },
  {
    Icon: Truck,
    title: 'We deliver',
    body: 'To your site anywhere in Pakistan, or hold it at the Bull Road counter for collection.',
  },
];

/*
 * The trust band. These are the twelve we are an authorised stockist for, and
 * naming them is the point — "we can get it" from a stranger means nothing,
 * "we have an account with Terasaki" means a lead time you can plan around.
 */
const PARTNER_BRANDS = [
  'Terasaki',
  'Fuji Electric',
  'Mitsubishi Electric',
  'Schneider Electric',
  'Hager',
  'Autonics',
  'IDEC',
  'Pilz',
  'WAGO',
  'National',
  'DELAB',
  'Torex',
];

export default async function SourcingRequestPage({
  searchParams,
}: {
  searchParams: { product?: string };
}): Promise<JSX.Element> {
  /*
   * Arriving from a product page ("need a different rating?"). The name is
   * looked up server-side so the form can pre-fill it — passing the name
   * through the query string instead would let anyone put words in our mouth.
   */
  const slug = searchParams.product;
  const detail = slug ? await getProduct(slug) : null;
  const productName = detail?.product.name;

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Source from China' }]} className="mb-4" />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {/*
            The eyebrow is navy, not cyan: #00AEEF on white is ~2.4:1, which
            fails AA for text this small. On the navy band the same cyan is
            fine, which is why the two differ.
          */}
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-navy">
            <ChinaFlag className="h-3.5 w-[21px]" />
            Source from China
          </p>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl">
            Can&apos;t find what you need? We&apos;ll source it from China.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Tell us the part. We check our China supplier network and come back with a price and a
            lead time you can plan around.
          </p>

          {productName ? (
            <p className="mt-4 rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 px-4 py-3 text-sm text-brand-navy">
              Looking for something like <strong>{productName}</strong>? Describe what needs to be
              different — rating, poles, brand — and we will find it.
            </p>
          ) : null}

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, body }, index) => (
              <li key={title} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-brand-cyan" aria-hidden />
                  <span className="text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-brand-navy">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>

          {/*
            Trust band. Sits above the form: the reason to bother filling it in.

            The wording draws the line explicitly. This page offers China
            sourcing, but the catalogue brands are supplied through official
            channels — and the FAQ makes a counterfeit-warranty promise about
            them. Blurring the two would undercut both claims, so the band says
            which is which.
          */}
          <section className="mt-8 rounded-lg border border-border bg-surface p-5">
            <p className="text-sm font-semibold text-brand-navy">
              Sourced from China to order — and still an authorised stockist for Terasaki, Fuji
              Electric, Mitsubishi Electric, Schneider, Hager, Autonics, IDEC, Pilz and WAGO.
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              We tell you which route your item comes by, and quote the lead time for that route.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PARTNER_BRANDS.map((name) => (
                <li
                  key={name}
                  className="rounded border border-border bg-white px-3 py-1.5 text-2xs font-bold uppercase tracking-wide text-brand-navy"
                >
                  {name}
                </li>
              ))}
            </ul>
          </section>

          <SourcingForm
            {...(slug ? { productSlug: slug } : {})}
            {...(productName ? { productName } : {})}
          />
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24">
          <p className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Rather just call?
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            If you have the part in front of you, a two-minute phone call usually beats a form.
          </p>
          <ContactCard variant="compact" showMap={false} />
        </aside>
      </div>
    </div>
  );
}
