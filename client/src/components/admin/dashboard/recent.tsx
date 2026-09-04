'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/feedback';
import { cn, formatDate } from '@/lib/utils';

/**
 * Recent activity: inquiries, contact enquiries and testimonials.
 *
 * Orders went with the commerce model. What replaces them is the two inboxes
 * that actually need answering — an unanswered inquiry and an unanswered
 * contact form are both lost business.
 *
 * The `/admin/dashboard/recent` endpoint returns loosely typed collections, so
 * each row is read through narrow accessors rather than casting the payload.
 * That looseness is why this panel silently rendered empty for a while: it
 * read `data.quotations` long after the API had started returning `inquiries`,
 * and no type existed to catch it.
 */

type Row = Record<string, unknown>;

const str = (row: Row, key: string): string => (typeof row[key] === 'string' ? (row[key] as string) : '');
const bool = (row: Row, key: string): boolean => row[key] === true;
const rowId = (row: Row): string => str(row, '_id') || str(row, 'id');

const customerName = (row: Row): string => {
  const customer = row.customer;
  if (customer && typeof customer === 'object' && 'name' in customer) {
    const name = (customer as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
};

export function RecentActivity({ data }: { data?: Record<string, unknown[]> }): JSX.Element {
  const inquiries = (data?.inquiries ?? []) as Row[];
  const contacts = (data?.contacts ?? []) as Row[];
  const testimonials = (data?.testimonials ?? []) as Row[];

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Panel title="Recent inquiries" href="/admin/inquiries" loading={!data}>
        {inquiries.length === 0 ? (
          <Empty label="No inquiries yet." />
        ) : (
          <ul className="divide-y divide-border">
            {inquiries.slice(0, 6).map((inquiry) => (
              <li
                key={str(inquiry, 'inquiryNumber')}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/inquiries/${rowId(inquiry)}`}
                    className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(inquiry, 'inquiryNumber')}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {customerName(inquiry)} · {formatDate(str(inquiry, 'createdAt'))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* No money on this row: the quote happens on the phone. */}
                  <Badge variant={str(inquiry, 'priority') === 'urgent' ? 'warning' : 'muted'}>
                    {str(inquiry, 'type') === 'sourcing_request' ? 'sourcing' : 'product'}
                  </Badge>
                  <Badge variant={str(inquiry, 'status') === 'new' ? 'accent' : 'muted'}>
                    {str(inquiry, 'status')}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent contact enquiries" href="/admin/contacts" loading={!data}>
        {contacts.length === 0 ? (
          <Empty label="No contact enquiries yet." />
        ) : (
          <ul className="divide-y divide-border">
            {contacts.slice(0, 6).map((contact) => (
              <li
                key={rowId(contact) || str(contact, 'email')}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href="/admin/contacts"
                    className="block truncate text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(contact, 'subject') || str(contact, 'name') || 'Enquiry'}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {str(contact, 'name')} · {formatDate(str(contact, 'createdAt'))}
                  </p>
                </div>
                <Badge variant={str(contact, 'status') === 'new' ? 'accent' : 'muted'}>
                  {str(contact, 'status')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Latest testimonials"
        href="/admin/testimonials"
        loading={!data}
        className="lg:col-span-2"
      >
        {testimonials.length === 0 ? (
          <Empty label="No testimonials captured yet." />
        ) : (
          <ul className="divide-y divide-border">
            {testimonials.slice(0, 5).map((item) => (
              <li key={rowId(item)} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-brand-navy">
                    {str(item, 'author')}
                  </span>
                  <p className="truncate text-2xs text-muted-foreground">
                    {str(item, 'company') || '—'} · {formatDate(str(item, 'createdAt'))}
                  </p>
                </div>
                <Badge variant={bool(item, 'isPublished') ? 'success' : 'warning'}>
                  {bool(item, 'isPublished') ? 'Published' : 'Draft'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  href,
  loading,
  className,
  children,
}: {
  title: string;
  href: string;
  loading: boolean;
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className={cn('rounded-lg border border-border bg-white p-5', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          {title}
        </h2>
        <Link href={href} className="text-xs font-medium text-brand-cyan hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Empty({ label }: { label: string }): JSX.Element {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
