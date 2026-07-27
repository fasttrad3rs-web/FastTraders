'use client';

import { PageHeader } from '@/components/admin/primitives';
import { ProductForm } from '@/components/admin/products/product-form';

export default function NewProductPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Add product"
        description="Create the record first, then upload images and datasheets against it."
      />
      <ProductForm />
    </>
  );
}
