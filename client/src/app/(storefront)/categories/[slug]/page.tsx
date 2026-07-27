import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/pagination';
import { CatalogView } from '@/components/catalog/catalog-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategory, getCategoryTree, getProducts } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getCategory(params.slug);

  if (!data) {
    return buildMetadata({
      title: 'Category not found',
      description: 'This category is no longer available.',
      path: `/categories/${params.slug}`,
      noIndex: true,
    });
  }

  const { category } = data;
  const title = category.seo?.title ?? `${category.name} — Buy in Lahore, Pakistan`;

  return buildMetadata({
    title,
    description:
      category.seo?.description ??
      `${category.name} from authorised brands, in stock in Lahore. ${category.description ?? ''}`.trim(),
    path: `/categories/${category.slug}`,
    keywords: category.seo?.keywords,
    ...(category.image ? { image: category.image } : {}),
  });
}

/** Category landing: description, subcategory chips, then the filtered grid. */
export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const data = await getCategory(params.slug);
  if (!data) notFound();

  const { category, breadcrumbs, children, productCount } = data;

  const [initial, tree] = await Promise.all([
    getProducts({ category: category.slug, limit: 24 }),
    getCategoryTree(),
  ]);

  const crumbs = [
    ...breadcrumbs.map((crumb) => ({ name: crumb.name, path: `/categories/${crumb.slug}` })),
    { name: category.name, path: `/categories/${category.slug}` },
  ];

  return (
    <div className="container py-8">
      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          ...(initial ? [itemListSchema(initial.items, (product) => `/products/${product.slug}`)] : []),
        ]}
      />

      <Breadcrumb
        className="mb-4"
        items={[
          ...breadcrumbs.map((crumb) => ({ label: crumb.name, href: `/categories/${crumb.slug}` })),
          { label: category.name },
        ]}
      />

      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{category.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{productCount} products</p>

        {children.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                >
                  {child.name}
                  <span className="text-2xs text-muted-foreground">{child.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <Suspense fallback={null}>
        <CatalogView
          initialData={initial}
          categories={tree ?? []}
          heading="products"
          lockedCategory={category.slug}
        />
      </Suspense>
    </div>
  );
}
