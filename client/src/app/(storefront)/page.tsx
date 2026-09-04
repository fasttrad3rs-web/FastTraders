import type { Metadata } from 'next';
import { HeroSlider } from '@/components/home/hero';
import { TrustStrip } from '@/components/home/trust-strip';
import { BrandGrid, CategoryGrid } from '@/components/home/discovery';
import { ArrivalsAndBestSellers, FeaturedCarousel } from '@/components/home/product-sections';
import { Industries, Testimonials, WhyChooseUs } from '@/components/home/marketing';
import { SourcingCTA } from '@/components/shared';
import { ContactStrip } from '@/components/home/contact-strip';
import { PromoStrip } from '@/components/home/promo-strip';
import { JsonLd } from '@/components/shared/json-ld';
import {
  getBanners,
  getBestSellers,
  getBrands,
  getCategoryTree,
  getFeaturedProducts,
  getNewArrivals,
  getTestimonials,
} from '@/lib/api/catalog';
import { buildMetadata, TARGET_KEYWORDS, localBusinessSchema, organizationSchema, websiteSchema } from '@/lib/seo';
import { SITE } from '@/lib/constants';

/** Homepage regenerates every 5 minutes along with the rest of the catalogue. */
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — Industrial & Electrical Equipment Supplier in Lahore`,
  description:
    'Circuit breakers, cables, contactors, PLCs, VFDs and automation parts in Lahore. Authorised stockist for Terasaki, Schneider Electric, Mitsubishi, Fuji, Hager, Autonics and more.',
  path: '/',
  keywords: TARGET_KEYWORDS,
});

export default async function HomePage(): Promise<JSX.Element> {
  // One parallel wave — a slow endpoint delays the page by its own latency,
  // not the sum of all seven.
  const [banners, stripBanners, categories, brands, featured, newArrivals, bestSellers, testimonials] =
    await Promise.all([
      getBanners('hero'),
      // The `strip` position was seeded and offered in the admin but never
      // fetched, so any banner set to it was invisible.
      getBanners('strip'),
      getCategoryTree(),
      getBrands(true),
      getFeaturedProducts(10),
      getNewArrivals(8),
      getBestSellers(8),
      getTestimonials(undefined, 6),
    ]);

  return (
    <>
      <JsonLd schemas={[organizationSchema(), localBusinessSchema(), websiteSchema()]} />

      <HeroSlider banners={banners ?? []} />
      <TrustStrip />
      <PromoStrip banners={stripBanners ?? []} />
      <CategoryGrid categories={categories ?? []} />
      <FeaturedCarousel products={featured?.items ?? []} />
      <BrandGrid brands={brands ?? []} />
      <SourcingCTA variant="band" />
      <ArrivalsAndBestSellers
        newArrivals={newArrivals?.items ?? []}
        bestSellers={bestSellers?.items ?? []}
      />
      <Industries />
      <WhyChooseUs />
      <Testimonials items={testimonials ?? []} />
      <ContactStrip />
    </>
  );
}
