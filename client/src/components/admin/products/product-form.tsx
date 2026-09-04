'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { ProductImageManager } from './image-manager';
import { BasicTab } from './form-tab-basic';
import { PricingTab, RepeaterTab, SeoTab } from './form-tabs';
import { productFormSchema, slugFromName, toApiPayload, type ProductFormValues } from './form-schema';
import { useProductMutations, useTaxonomy } from '@/lib/api/admin';
import type { AdminProduct } from '@/lib/api/admin';
import { AvailabilityBadge } from '@/components/shared/availability-badge';

/**
 * Product create/edit form.
 *
 * Seven tabs plus a live preview column showing the card as a shopper will see
 * it — which is the fastest way to catch a wrong pricing mode or a missing
 * lastQuotedPrice before saving.
 */
export function ProductForm({ product }: { product?: AdminProduct }): JSX.Element {
  const router = useRouter();
  const mutations = useProductMutations();
  const categories = useTaxonomy('categories');
  const brands = useTaxonomy('brands');

  const isEdit = product !== undefined;

  // The resolver is typed against the *output* shape; RHF holds the input
  // shape. Casting here is narrower than loosening either generic.
  const form = useForm<ProductFormValues, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          partNumber: product.partNumber ?? '',
          description: product.description,
          shortDescription: product.shortDescription ?? '',
          category: typeof product.category === 'string' ? product.category : product.category.id,
          subCategory:
            product.subCategory && typeof product.subCategory !== 'string' ? product.subCategory.id : '',
          brand: typeof product.brand === 'string' ? product.brand : product.brand.id,
          lastQuotedPrice: product.lastQuotedPrice,
          internalCost: product.internalCost,
          availability: product.availability,
          leadTime: product.leadTime ?? '',
          isImportItem: product.isImportItem,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          unit: product.unit,
          minOrderQty: product.minOrderQty,
          specifications: product.specifications,
          variants: product.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
          })),
          datasheets: product.datasheets,
          tags: product.tags.join(', '),
          warranty: product.warranty ?? '',
          isFeatured: product.isFeatured,
          isNewArrival: product.isNewArrival,
          isBestSeller: product.isBestSeller,
          isActive: product.isActive,
          seoTitle: product.seo?.title ?? '',
          seoDescription: product.seo?.description ?? '',
          seoKeywords: product.seo?.keywords.join(', ') ?? '',
        }
      : {
          availability: 'available_on_order' as const,
          isImportItem: false,
          stock: 0,
          lowStockThreshold: 5,
          unit: 'piece',
          minOrderQty: 1,
          specifications: [],
          variants: [],
          datasheets: [],
          isActive: true,
          isFeatured: false,
          isNewArrival: false,
          isBestSeller: false,
        },
  });

  const { watch, setValue, handleSubmit, formState } = form;
  const name = watch('name');
  const slug = watch('slug');

  // Auto-slug from the name, but never overwrite a slug on an existing
  // product — changing it would break inbound links and search rankings.
  useEffect(() => {
    if (isEdit || !name) return;
    if (!slug || slug === slugFromName(name.slice(0, -1))) {
      setValue('slug', slugFromName(name));
    }
  }, [name, slug, isEdit, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = toApiPayload(values);

    try {
      if (isEdit) {
        await mutations.update.mutateAsync({ id: product.id, patch: payload });
        toast.success('Product saved');
      } else {
        const created = await mutations.create.mutateAsync(payload);
        toast.success('Product created', { description: created.name });
        router.push(`/admin/products/${created.id}/edit`);
      }
    } catch (error) {
      toast.error('Could not save', {
        description: error instanceof Error ? error.message : 'Please check the form and try again.',
      });
    }
  });

  const errorCount = Object.keys(formState.errors).length;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
      <div className="rounded-lg border border-border bg-white p-5">
        {errorCount > 0 ? (
          <Alert variant="danger" title={`${errorCount} field(s) need attention`} className="mb-4">
            Check the highlighted tabs before saving.
          </Alert>
        ) : null}

        <Tabs defaultValue="basic">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="basic">Basic info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing &amp; stock</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicTab form={form} categories={categories.data ?? []} brands={brands.data ?? []} />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab form={form} />
          </TabsContent>

          <TabsContent value="images">
            <ProductImageManager product={product} />
          </TabsContent>

          <TabsContent value="specs">
            <RepeaterTab
              form={form}
              name="specifications"
              addLabel="Add specification"
              emptyHint="No specifications yet. These are what part-number searches match on — add the rating, poles and breaking capacity."
              columns={[
                { key: 'group', label: 'Group', placeholder: 'Electrical' },
                { key: 'key', label: 'Name', placeholder: 'Rated Current' },
                { key: 'value', label: 'Value', placeholder: '250 A' },
              ]}
            />
          </TabsContent>

          <TabsContent value="variants">
            <RepeaterTab
              form={form}
              name="variants"
              addLabel="Add variant"
              emptyHint="No variants. Add one per pole count or current rating if this product ships in several forms."
              columns={[
                { key: 'name', label: 'Name', placeholder: '3P 250A' },
                { key: 'sku', label: 'SKU', placeholder: 'SCH-CVS250-3P' },
                { key: 'stock', label: 'Stock', type: 'number' },
              ]}
            />
          </TabsContent>

          <TabsContent value="datasheets">
            <RepeaterTab
              form={form}
              name="datasheets"
              addLabel="Add datasheet"
              emptyHint="No datasheets linked. Paste a Cloudinary URL, or upload the PDF from the Images tab."
              columns={[
                { key: 'title', label: 'Title', placeholder: 'CVS100F technical datasheet' },
                { key: 'url', label: 'URL', placeholder: 'https://res.cloudinary.com/…' },
              ]}
            />
          </TabsContent>

          <TabsContent value="seo">
            <SeoTab form={form} />
          </TabsContent>
        </Tabs>
      </div>

      <aside className="sticky top-6 space-y-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            <Eye className="size-3.5" aria-hidden />
            Live preview
          </p>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-2xs font-bold uppercase text-brand-cyan">
                {brands.data?.find((brand) => brand.id === watch('brand'))?.name ?? 'Brand'}
              </span>
              {/*
                The SAME badge the storefront renders, from the SAME field.
                This used to derive a stock-level badge from `stock`, so the
                preview said "IN STOCK" for a product the public page called
                "Available on Order" — two vocabularies, two fields, one of
                them not even shown to buyers. A preview that disagrees with
                the page it previews is worse than no preview.
              */}
              <AvailabilityBadge value={watch('availability')} size="sm" />
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground">
              {name || 'Product name'}
            </p>
            <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{watch('sku') || 'SKU'}</p>
            {/* The storefront shows no price, so the preview shows what a
                shopper actually sees. */}
            <div className="mt-3">
              <span className="block font-heading text-sm font-bold text-brand-cyan">
                Price on request
              </span>
              {typeof watch('lastQuotedPrice') === 'number' ? (
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  Internal: Rs. {Number(watch('lastQuotedPrice')).toLocaleString('en-US')}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {watch('isActive') ? null : <Badge variant="muted">Inactive</Badge>}
              {watch('isFeatured') ? <Badge variant="accent">Featured</Badge> : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <Button
            type="submit"
            variant="cta"
            block
            isLoading={mutations.create.isPending || mutations.update.isPending}
            loadingText="Saving…"
          >
            <Save />
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="ghost" block className="mt-2" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </aside>
    </form>
  );
}
