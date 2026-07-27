'use client';

import { Badge } from '@/components/ui/badge';
import { ResourceScreen } from '@/components/admin/crud/resource-screen';

interface BannerRecord {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  ctaText?: string;
  position: 'hero' | 'strip' | 'sidebar';
  displayOrder: number;
  isActive: boolean;
  [key: string]: unknown;
}

/** Banner CRUD. Each row renders a live preview of how it appears on the site. */
export default function AdminBannersPage(): JSX.Element {
  return (
    <ResourceScreen<BannerRecord>
      resource="banners"
      title="Banners"
      description="Homepage hero slides and promotional strips."
      fields={[
        { name: 'title', label: 'Headline', kind: 'text', required: true },
        { name: 'subtitle', label: 'Subtitle', kind: 'textarea' },
        { name: 'image', label: 'Image URL', kind: 'url', required: true, hint: '1920×720 for hero, 1920×300 for strip.' },
        { name: 'mobileImage', label: 'Mobile image URL', kind: 'url', hint: 'Portrait crop, 828×1000.' },
        { name: 'link', label: 'Link', kind: 'text', placeholder: '/products' },
        { name: 'ctaText', label: 'Button text', kind: 'text', placeholder: 'Browse Catalog' },
        {
          name: 'position',
          label: 'Position',
          kind: 'select',
          required: true,
          options: [
            { value: 'hero', label: 'Hero slider' },
            { value: 'strip', label: 'Promotional strip' },
            { value: 'sidebar', label: 'Sidebar' },
          ],
        },
        { name: 'displayOrder', label: 'Display order', kind: 'number' },
        { name: 'startsAt', label: 'Starts', kind: 'date', hint: 'Optional scheduling.' },
        { name: 'endsAt', label: 'Ends', kind: 'date' },
        { name: 'isActive', label: 'Active', kind: 'boolean' },
      ]}
      columns={[]}
      emptyTitle="No banners yet"
      renderRow={(banner) => (
        <div className="flex items-center gap-4">
          <span className="relative h-14 w-28 shrink-0 overflow-hidden rounded border border-border bg-brand-dark">
            {/* Remote promotional artwork of arbitrary dimensions. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.image} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-[8px] font-bold uppercase leading-tight text-white">
              {banner.title.slice(0, 40)}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-navy">{banner.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{banner.position}</Badge>
              <span className="text-2xs text-muted-foreground">order {banner.displayOrder}</span>
              {banner.isActive ? null : <Badge variant="muted">Inactive</Badge>}
            </span>
          </span>
        </div>
      )}
    />
  );
}
