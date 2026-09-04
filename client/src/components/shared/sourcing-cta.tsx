import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChinaFlag } from './china-flag';
import { cn } from '@/lib/utils';

/**
 * "Can't find it? We source it."
 *
 * The catalogue is a sample of what Fast Traders supplies, not the limit of
 * it — so every place a buyer might conclude "they don't have it" needs this
 * within reach. That is four moments, and the tone differs at each:
 *
 *   `inline`  — a quiet prompt beside a product that is nearly right
 *   `panel`   — the empty search result, where the alternative is leaving
 *   `band`    — full-width, on the homepage and the inquiry list
 *
 * A server component: it is a link, not a widget, and shipping JavaScript for
 * it would be waste on a 3G connection.
 */
export function SourcingCTA({
  variant = 'inline',
  productSlug,
  className,
}: {
  variant?: 'inline' | 'panel' | 'band';
  /** Carries the product through so the form can pre-fill it. */
  productSlug?: string;
  className?: string;
}): JSX.Element {
  const href = productSlug ? `/source-from-china?product=${productSlug}` : '/source-from-china';

  if (variant === 'band') {
    return (
      <section className={cn('container py-12', className)}>
        <div className="bg-brand-gradient flex flex-col items-start gap-6 rounded-lg p-8 text-white lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
              <ChinaFlag className="h-3.5 w-[21px]" />
              Source from China
            </p>
            <h2 className="mt-2 font-heading text-xl font-bold uppercase tracking-tight sm:text-2xl">
              Can&apos;t find what you need? We&apos;ll source it from China.
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Obsolete breakers, a brand we do not normally stock, a rating nobody in the market
              has. Tell us the part — we check our China supplier network and come back with a
              price and a lead time.
            </p>
          </div>

          <Button asChild variant="cta" size="lg" className="shrink-0">
            <Link href={href}>
              <Search />
              Tell us what you need
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={cn(
          'rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-6 text-center',
          className,
        )}
      >
        <Search className="mx-auto size-6 text-brand-cyan" aria-hidden />
        <p className="mt-3 font-heading text-base font-bold uppercase tracking-tight text-brand-navy">
          Not in the catalogue? We can still get it.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          We source from China to order. Send us the part number, or a photo of the nameplate, and
          we will tell you honestly whether we can find it and how long it takes.
        </p>
        <Button asChild variant="cta" className="mt-4">
          <Link href={href}>
            Send a sourcing request
            <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-4', className)}>
      <p className="text-sm font-semibold text-brand-navy">
        Need this in bulk, or a different rating?
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        We source from China to order — tell us what has to change and we will find it.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href={href}>
          <Search />
          Source it from China
        </Link>
      </Button>
    </div>
  );
}
