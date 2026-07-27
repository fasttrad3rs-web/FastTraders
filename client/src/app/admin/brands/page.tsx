'use client';

import { ResourceScreen } from '@/components/admin/crud/resource-screen';

interface BrandRecord {
  id: string;
  name: string;
  slug: string;
  country?: string;
  logo?: string;
  displayOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

export default function AdminBrandsPage(): JSX.Element {
  return (
    <ResourceScreen<BrandRecord>
      resource="brands"
      title="Brands"
      fields={[
        { name: 'name', label: 'Name', kind: 'text', required: true },
        { name: 'slug', label: 'Slug', kind: 'text', hint: 'Leave blank to generate from the name.' },
        { name: 'country', label: 'Country of origin', kind: 'text', placeholder: 'Japan' },
        { name: 'logo', label: 'Logo URL', kind: 'url', hint: 'Upload to Cloudinary and paste the URL.' },
        { name: 'website', label: 'Manufacturer website', kind: 'url' },
        { name: 'description', label: 'Description', kind: 'textarea' },
        { name: 'displayOrder', label: 'Display order', kind: 'number' },
        { name: 'isFeatured', label: 'Featured', kind: 'boolean', hint: 'Show in the homepage mega-menu' },
        { name: 'isActive', label: 'Active', kind: 'boolean', hint: 'Visible on the storefront' },
      ]}
      columns={[]}
      emptyTitle="No brands yet"
      renderRow={(brand) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded border border-border bg-surface text-[10px] font-bold uppercase text-brand-navy">
            {brand.logo ? (
              // Brand logos are remote Cloudinary assets of unknown ratio.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="" className="max-h-8 max-w-14 object-contain" />
            ) : (
              brand.name.slice(0, 8)
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-navy">{brand.name}</span>
            <span className="block text-2xs text-muted-foreground">
              {brand.country ?? '—'} · order {brand.displayOrder}
              {brand.isActive ? '' : ' · inactive'}
            </span>
          </span>
        </div>
      )}
    />
  );
}
