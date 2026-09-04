import { Download, FileText, Truck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/feedback';
import type { Product, Specification } from '@/types';

/**
 * Description · Specifications · Datasheets · Delivery & Warranty.
 *
 * No reviews tab. Ratings would have to come from testimonials an admin
 * typed in, which is not feedback from verified buyers — showing it as one
 * would be inventing a trust signal.
 *
 * Every panel is `forceMount`ed. Radix unmounts inactive tabs by default,
 * which would keep the specification table out of the server-rendered HTML —
 * and specs are exactly what part-number searches match on ("MCCB 250A 36kA").
 * Radix still sets `hidden` on the inactive panels, so nothing is visible or
 * focusable until its tab is selected.
 */

/** Group specs by their `group` field so the table reads like a datasheet. */
function groupSpecs(specs: Specification[]): { group: string; rows: Specification[] }[] {
  const map = new Map<string, Specification[]>();

  for (const spec of specs) {
    const key = spec.group ?? 'General';
    map.set(key, [...(map.get(key) ?? []), spec]);
  }

  return [...map.entries()].map(([group, rows]) => ({ group, rows }));
}

export function ProductTabs({ product }: { product: Product }): JSX.Element {
  const groups = groupSpecs(product.specifications);

  return (
    <Tabs defaultValue="description" className="mt-12">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
        <TabsTrigger value="shipping">Delivery &amp; Warranty</TabsTrigger>
      </TabsList>

      <TabsContent value="description" forceMount>
        <div
          className="prose-sm max-w-3xl text-sm leading-relaxed text-foreground [&_p]:mb-3 [&_strong]:text-brand-navy"
          // Description is rich text written by an admin, not by the public.
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </TabsContent>

      <TabsContent value="specs" forceMount>
        {groups.length === 0 ? (
          <EmptyState
            title="No specifications listed yet"
            description="Ask us on WhatsApp with the part number and we will send the full datasheet."
          />
        ) : (
          <div className="max-w-3xl space-y-6">
            {groups.map(({ group, rows }) => (
              <div key={group}>
                <h3 className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h3>
                <dl className="divide-y divide-border rounded-lg border border-border bg-white">
                  {rows.map((spec) => (
                    <div key={spec.key} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                      <dt className="text-muted-foreground">{spec.key}</dt>
                      <dd className="font-medium text-foreground">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="datasheets" forceMount>
        {product.datasheets.length === 0 ? (
          <EmptyState
            title="No datasheet uploaded"
            description="Request one and we will email the manufacturer's PDF."
            icon={<FileText />}
          />
        ) : (
          <ul className="max-w-2xl space-y-2">
            {product.datasheets.map((sheet) => (
              <li key={sheet.publicId}>
                <a
                  href={sheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <FileText className="size-5 shrink-0 text-brand-cyan" aria-hidden />
                  <span className="flex-1 text-sm font-medium text-foreground">{sheet.title}</span>
                  <Download className="size-4 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="shipping" forceMount>
        <div className="max-w-2xl space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">Delivery</p>
              <p className="mt-1">
                Lahore 1–2 working days, Punjab 2–4, rest of Pakistan 3–6. Delivery is confirmed
                with your quote, and larger orders often carry it free. Same-day collection is
                available from our counter at Grace Tower, Bull Road.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">Returns &amp; warranty</p>
              <p className="mt-1">
                Report shortages or transit damage within 48 hours of delivery. Unused items in
                original packaging can be returned within 7 days. Warranty follows the
                manufacturer&rsquo;s terms for the brand concerned
                {product.warranty ? ` — this item: ${product.warranty}` : ''}.
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
