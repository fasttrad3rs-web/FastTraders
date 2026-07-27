'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/feedback';
import { ErrorState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { ProductForm } from '@/components/admin/products/product-form';
import { useAdminProduct } from '@/lib/api/admin';

export default function EditProductPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { data: product, isPending, isError, refetch } = useAdminProduct(params.id);

  if (isPending) {
    return (
      <>
        <PageHeader title="Edit product" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (isError || !product) {
    return <ErrorState title="Product not found" onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageHeader title={product.name} description={`SKU ${product.sku}`} />
      <ProductForm product={product} />
    </>
  );
}
