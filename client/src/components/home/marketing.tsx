import Link from 'next/link';
import { Building2, Cpu, Factory, HardHat, Quote, Shirt, UtensilsCrossed, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import type { Testimonial } from '@/types';

/*
 * `RfqBanner` lived here. It is now `<SourcingCTA variant="band">` in
 * components/shared, so the homepage, the inquiry list and the empty search
 * result all say the same thing in the same words.
 */

const INDUSTRIES = [
  { Icon: Factory, name: 'Manufacturing', body: 'Panel builds, machine retrofits and spares.' },
  { Icon: Shirt, name: 'Textile', body: 'Drives, sensors and motor control for looms and dyeing.' },
  { Icon: UtensilsCrossed, name: 'Food Processing', body: 'Washdown-rated sensors and hygienic control gear.' },
  { Icon: HardHat, name: 'Construction', body: 'Distribution boards, cable and site power.' },
  { Icon: Zap, name: 'Power & Energy', body: 'Switchgear, PFI capacitors and protection relays.' },
  { Icon: Cpu, name: 'Automation', body: 'PLCs, HMIs and the I/O to tie them together.' },
] as const;

export function Industries(): JSX.Element {
  return (
    <section className="border-y border-border bg-white py-14">
      <div className="container">
        <SectionHeading
          title="Industries We Serve"
          description="The same counter supplies a one-off replacement and a full plant fit-out."
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map(({ Icon, name, body }) => (
            <li key={name}>
              <Link
                href={`/industries#${name.toLowerCase().replace(/\s|&/g, '-')}`}
                className="group flex h-full gap-4 rounded-lg border border-border bg-surface p-5 transition-all hover:border-brand-cyan hover:bg-white"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white transition-colors group-hover:bg-brand-cyan">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                    {name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const REASONS = [
  'Authorised stockist for twelve manufacturers, so what you buy is genuine.',
  'Staff who can read a single-line diagram and tell you what actually fits.',
  'Real stock on the shelf at Bull Road — not a drop-ship catalogue.',
  'Trade pricing on bills of materials, quoted in writing within a working day.',
] as const;

export function WhyChooseUs(): JSX.Element {
  return (
    <section className="container py-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading title="Why Choose Fast Traders" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Fast Traders has supplied industrial and electrical equipment from Grace Tower on Bull
            Road, Lahore for years, under the direction of{' '}
            <strong className="font-semibold text-brand-navy">Sharjeel Bin Ejaz</strong>. We deal in
            all kinds of industrial equipment, parts and accessories — from a single miniature
            circuit breaker to the switchgear and automation for a complete plant.
          </p>

          <ul className="mt-6 space-y-3">
            {REASONS.map((reason) => (
              <li key={reason} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-cyan" aria-hidden />
                <span className="text-foreground">{reason}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/about">About the company</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">
                <Building2 />
                Visit the counter
              </Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          {[
            { value: '12', label: 'Authorised brands' },
            { value: '20+', label: 'Product categories' },
            { value: '1 day', label: 'Typical quote turnaround' },
            { value: 'Lahore', label: 'Same-day collection' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-white p-6 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-heading text-3xl font-extrabold text-brand-navy">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Testimonials.
 *
 * Fed from the admin-managed collection. When nothing is published the whole
 * section is omitted rather than filled with invented quotes — a B2B buyer in
 * Lahore can check whether "Kohinoor Textile Mills" really said that.
 */
export function Testimonials({ items }: { items: Testimonial[] }): JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border bg-white py-14">
      <div className="container">
        <SectionHeading title="What Customers Say" />

        <ul className="grid gap-4 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className="flex flex-col rounded-lg border border-border bg-surface p-6">
              <Quote className="size-6 text-brand-cyan" aria-hidden />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                {item.quote}
              </blockquote>
              <footer className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold text-brand-navy">{item.author}</p>
                <p className="text-2xs text-muted-foreground">
                  {[item.role, item.company].filter(Boolean).join(', ') || '—'}
                </p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
