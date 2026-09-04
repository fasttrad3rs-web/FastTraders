'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageProps } from '@/lib/images';
import { cn } from '@/lib/utils';
import type { Banner } from '@/types';

/**
 * Hero slider driven by the `hero` banners from Settings.
 *
 * Auto-advances every 7 seconds, pauses on hover or focus, and stops entirely
 * for `prefers-reduced-motion`. The first slide's image is `priority` — it is
 * the LCP element on the homepage.
 */
export function HeroSlider({ banners }: { banners: Banner[] }): JSX.Element | null {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="bg-brand-gradient relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {banners.map((banner, position) => (
        <div
          key={banner.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${position + 1} of ${count}`}
          aria-hidden={position !== index}
          className={cn(
            'transition-opacity duration-500',
            position === index ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0',
          )}
        >
          <div className="container grid items-center gap-8 py-14 lg:grid-cols-2 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
                Lahore, Pakistan
              </p>
              <h1 className="text-balance mt-4 font-heading text-3xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {banner.title}
              </h1>
              {banner.subtitle ? (
                <p className="mt-4 max-w-xl text-base text-white/70">{banner.subtitle}</p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="cta" size="lg">
                  <Link href={banner.link ?? '/products'}>
                    {banner.ctaText ?? 'Browse Catalog'}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/submit-inquiry">
                    <FileText />
                    Request a Quote
                  </Link>
                </Button>
              </div>
            </div>

            {/*
              Art direction, not a duplicate.

              The desktop crop is 16:10 and sits beside the text. On a phone
              there is no room for that, so the admin form asks for a separate
              portrait crop — and until now it collected one and never rendered
              it, leaving every mobile visitor with a text-only hero on the most
              mobile-heavy audience this site has.

              `mobileImage` is optional, so the small-screen block only appears
              when one was actually supplied. Given the 3G target, adding an
              image that is not there is worse than showing none.
            */}
            {banner.mobileImage ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 lg:hidden">
                <Image
                  {...imageProps(banner.mobileImage)}
                  alt={banner.title}
                  fill
                  sizes="(min-width: 1024px) 0px, 100vw"
                  priority={position === 0}
                  className="object-cover"
                />
              </div>
            ) : null}

            {/*
              `object-contain`, not `cover`.

              The hero art is currently the 1200x630 brand card, and the slot is
              16:10. Covering it crops 16% of the width — enough to cut the logo
              mark and the first letter off every line ("ndustrial", "race
              Tower"). Containing it letterboxes instead, and the bands are
              invisible because the card's background is the same navy as the
              hero behind it.

              When real photography replaces the card, switch this back to
              `object-cover` — a photo should fill the frame.
            */}
            <div className="relative hidden aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-brand-dark lg:block">
              <Image
                {...imageProps(banner.image)}
                alt={banner.title}
                fill
                sizes="(max-width: 1024px) 0px, 50vw"
                priority={position === 0}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      ))}

      {count > 1 ? (
        <div className="container flex items-center gap-3 pb-6">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="ml-2 flex gap-1.5">
            {banners.map((banner, position) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(position)}
                aria-label={`Go to slide ${position + 1}`}
                aria-current={position === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  position === index ? 'w-7 bg-brand-cyan' : 'w-3 bg-white/30 hover:bg-white/50',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
