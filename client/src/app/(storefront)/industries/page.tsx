import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu, Factory, HardHat, Shirt, UtensilsCrossed, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Industries We Serve — Manufacturing, Textile, Power & Automation',
  description:
    'Fast Traders supplies switchgear, automation and control equipment to manufacturing, textile, food processing, construction, power and automation sectors across Pakistan.',
  path: '/industries',
  keywords: ['industrial automation parts Lahore', 'textile mill electrical supplier Pakistan'],
});

const INDUSTRIES = [
  {
    id: 'manufacturing',
    Icon: Factory,
    name: 'Manufacturing',
    body: 'Panel builds, machine retrofits and the spares that keep a line running. Contactors, overload relays, motor protection and distribution gear off the shelf.',
    categories: ['contactors-relays', 'motors-starters', 'distribution-boards-panels'],
  },
  {
    id: 'textile',
    Icon: Shirt,
    name: 'Textile',
    body: 'Drives, sensors and motor control for looms, dyeing and finishing. Fuji and Mitsubishi inverters are common on Faisalabad and Lahore plant.',
    categories: ['vfds-drives', 'sensors', 'temperature-controllers'],
  },
  {
    id: 'food-processing',
    Icon: UtensilsCrossed,
    name: 'Food Processing',
    body: 'Washdown-rated sensors, hygienic control gear and temperature control for ovens, chillers and process lines.',
    categories: ['sensors', 'temperature-controllers', 'safety-products'],
  },
  {
    id: 'construction',
    Icon: HardHat,
    name: 'Construction',
    body: 'Distribution boards, cable, site power and protection for commercial and residential projects.',
    categories: ['cables-wiring', 'distribution-boards-panels', 'circuit-breakers'],
  },
  {
    id: 'power-energy',
    Icon: Zap,
    name: 'Power & Energy',
    body: 'Air circuit breakers, PFI capacitors, protection relays and busbar for LT panels and substations.',
    categories: ['switchgear-protection', 'capacitors', 'busbars-enclosures'],
  },
  {
    id: 'automation',
    Icon: Cpu,
    name: 'Automation',
    body: 'PLCs, HMIs, encoders and the I/O to tie them together — Mitsubishi, Schneider, IDEC and Autonics.',
    categories: ['plcs-hmis', 'encoders', 'timers-counters'],
  },
] as const;

export default function IndustriesPage(): JSX.Element {
  return (
    <div className="container py-8">
      <JsonLd schemas={[breadcrumbSchema([{ name: 'Industries', path: '/industries' }])]} />

      <Breadcrumb items={[{ label: 'Industries' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Industries We Serve
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        The same counter supplies a one-off replacement breaker and a full plant fit-out. Here is
        where most of our work goes.
      </p>

      <div className="mt-8 space-y-4">
        {INDUSTRIES.map(({ id, Icon, name, body, categories }) => (
          <section
            key={id}
            id={id}
            className="scroll-mt-28 rounded-lg border border-border bg-white p-6 sm:flex sm:gap-5"
          >
            <span className="mb-3 flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white sm:mb-0">
              <Icon className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
                {name}
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{body}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {categories.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/categories/${slug}`}
                      className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                    >
                      {slug.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-brand-gradient p-8 text-center text-white">
        <h2 className="font-heading text-xl font-bold uppercase tracking-tight">
          Fitting out a plant?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Send the bill of materials and we will quote the lot in one go.
        </p>
        <Button asChild variant="cta" size="lg" className="mt-5">
          <Link href="/submit-inquiry">Request a quote</Link>
        </Button>
      </div>
    </div>
  );
}
