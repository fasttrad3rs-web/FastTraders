import Link from 'next/link';
import { BrandLogo } from '@/components/shared/brand-logo';
import { mockBrands } from '@/lib/mock-data';

/**
 * Authorised-brand strip.
 *
 * Real logos on white tiles, not text. Being an authorised stockist for
 * Terasaki and Mitsubishi is one of the strongest trust signals this business
 * has, and a panel builder recognises those marks instantly in a way they
 * never would from the name set in our own typeface.
 *
 * The tiles are white because most of these logos are dark ink — see
 * `BrandLogo`. Muted at rest and full strength on hover, so twelve marks do
 * not shout over the footer content above them.
 */
export function BrandStrip(): JSX.Element {
  return (
    <div className="border-t border-white/10 py-8">
      <p className="mb-5 text-center text-2xs font-bold uppercase tracking-[0.2em] text-white/40">
        Authorised &amp; stocked brands
      </p>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {mockBrands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={`/brands/${brand.slug}`}
              title={`${brand.name} — ${brand.country}`}
              className="group flex h-14 items-center justify-center rounded-lg border border-white/10 opacity-80 transition-all hover:border-brand-cyan/50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
            >
              <BrandLogo slug={brand.slug} name={brand.name} sizes="(max-width: 640px) 30vw, 140px" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
