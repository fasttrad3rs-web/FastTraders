import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { imageProps } from '@/lib/images';
import type { Banner } from '@/types';

/**
 * The `strip` banner position.
 *
 * This position existed in the model, in the admin form's dropdown, and in the
 * seed — but nothing ever fetched it. A banner set to "Promotional strip" was
 * saved successfully and then silently never appeared anywhere, which is worse
 * than the feature not existing: Sharjeel would have had no way to tell that
 * his promotion was invisible.
 *
 * Renders the first active strip banner only. Two competing promotional bars
 * on one page is a design accident, not a feature, so the rest are ignored
 * rather than stacked.
 */
export function PromoStrip({ banners }: { banners: Banner[] }): JSX.Element | null {
  const banner = banners[0];
  if (!banner) return null;

  const body = (
    <div className="container flex flex-col items-center gap-4 py-5 sm:flex-row sm:py-4">
      {banner.image ? (
        <div className="relative hidden size-14 shrink-0 overflow-hidden rounded-md border border-white/20 sm:block">
          <Image
            {...imageProps(banner.image)}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-white">
          {banner.title}
        </p>
        {banner.subtitle ? (
          <p className="mt-0.5 text-xs text-white/80">{banner.subtitle}</p>
        ) : null}
      </div>

      {banner.ctaText ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-navy">
          {banner.ctaText}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      ) : null}
    </div>
  );

  /*
   * The whole strip is the click target when a link is set — a thin bar with a
   * small button is an awkward tap on a phone. Without a link it stays inert
   * rather than becoming a dead anchor.
   */
  return (
    <section aria-label={banner.title} className="bg-brand-navy">
      {banner.link ? (
        <Link
          href={banner.link}
          className="block transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </section>
  );
}
