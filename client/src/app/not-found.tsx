import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer, Header, SearchBar } from '@/components/layout';
import { mockCategories } from '@/lib/mock-data';

/** Global 404. Sits outside the storefront group, so it brings its own chrome. */
export default function NotFound(): JSX.Element {
  return (
    <>
      <Header />
      <main id="main" className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-heading text-6xl font-extrabold text-brand-navy/15 sm:text-8xl">404</p>
      <h1 className="mt-2 font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy">
        Page not found
      </h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        The page you were looking for has moved or no longer exists. Try searching for the part
        number instead — we stock more than the catalogue shows.
      </p>

      <div className="mt-7 w-full max-w-xl">
        <SearchBar />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href="/products">
            <Search />
            Browse all products
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/submit-inquiry">Request a quote</Link>
        </Button>
      </div>

      <div className="mt-10 w-full max-w-2xl border-t border-border pt-6">
        <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
          Popular categories
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {mockCategories.slice(0, 6).map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
