'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResourceScreen } from '@/components/admin/crud/resource-screen';

/**
 * Testimonials — admin-entered, not customer-submitted.
 *
 * With no customer accounts there is no way to verify who wrote a review, so
 * an open review form would be an invitation to spam and to competitors.
 * Instead Sharjeel transcribes quotes from real correspondence and publishes
 * them under his own responsibility. A draft is invisible on the storefront
 * until it is ticked live, so a quote can be captured now and cleared with the
 * customer later.
 */

interface TestimonialRecord {
  id: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  rating?: number;
  isPublished: boolean;
  displayOrder: number;
  [key: string]: unknown;
}

export default function AdminTestimonialsPage(): JSX.Element {
  return (
    <ResourceScreen<TestimonialRecord>
      resource="testimonials"
      title="Testimonials"
      description="Quotes from real customers, entered by staff and published manually."
      fields={[
        {
          name: 'quote',
          label: 'Quote',
          kind: 'textarea',
          required: true,
          hint: 'The customer’s own words. Trim for length, never for meaning.',
          placeholder: 'They sourced a Terasaki ACB for us in four days when nobody else would quote.',
        },
        { name: 'author', label: 'Author', kind: 'text', required: true, placeholder: 'Imran Sheikh' },
        { name: 'role', label: 'Role', kind: 'text', placeholder: 'Maintenance Manager' },
        { name: 'company', label: 'Company', kind: 'text', placeholder: 'Kohinoor Textile Mills' },
        {
          name: 'product',
          label: 'Related product ID',
          kind: 'text',
          hint: 'Optional. Paste a product ID to show this quote on that product page.',
        },
        { name: 'rating', label: 'Rating (1–5)', kind: 'number', hint: 'Optional — omit if not asked.' },
        { name: 'displayOrder', label: 'Display order', kind: 'number', hint: 'Lower shows first.' },
        {
          name: 'isPublished',
          label: 'Published',
          kind: 'boolean',
          hint: 'Only publish once the customer is happy to be quoted by name.',
        },
      ]}
      columns={[]}
      emptyTitle="No testimonials yet"
      renderRow={(testimonial) => (
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm italic text-foreground">“{testimonial.quote}”</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-brand-navy">{testimonial.author}</span>
            <span className="text-2xs text-muted-foreground">
              {[testimonial.role, testimonial.company].filter(Boolean).join(', ') || '—'}
            </span>

            {typeof testimonial.rating === 'number' ? (
              <span
                className="flex items-center gap-0.5 text-2xs text-muted-foreground"
                aria-label={`Rated ${testimonial.rating} out of 5`}
              >
                <Star className="size-3 fill-brand-cyan text-brand-cyan" aria-hidden />
                {testimonial.rating}
              </span>
            ) : null}

            <Badge variant={testimonial.isPublished ? 'success' : 'warning'}>
              {testimonial.isPublished ? 'Published' : 'Draft'}
            </Badge>

            <span className="text-2xs text-muted-foreground">order {testimonial.displayOrder}</span>
          </div>
        </div>
      )}
    />
  );
}
