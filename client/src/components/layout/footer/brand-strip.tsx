import Link from 'next/link';
import { mockBrands } from '@/lib/mock-data';

/**
 * Authorised-brand strip.
 * Grayscale until hover — the client's authorisations are a trust signal, and
 * twelve full-colour logos at once would fight the navy footer.
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
              className="group flex h-14 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/45 grayscale transition-all hover:border-brand-cyan/50 hover:bg-white/10 hover:text-brand-cyan hover:grayscale-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
