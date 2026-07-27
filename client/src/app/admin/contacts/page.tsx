'use client';

import { useState } from 'react';
import { Mail, MailOpen, Phone, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList, useContactStatus } from '@/lib/api/admin-resources';
import { cn, formatDate } from '@/lib/utils';

interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  source: string;
  status: 'new' | 'read' | 'responded';
  createdAt: string;
}

const TABS = ['new', 'read', 'responded', 'all'] as const;

/** Inbox-style enquiry list. Expanding a message marks it read. */
export default function AdminContactsPage(): JSX.Element {
  const [tab, setTab] = useState<(typeof TABS)[number]>('new');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isPending } = useAdminList<ContactRow>('contacts', {
    page,
    limit: 20,
    ...(tab !== 'all' ? { status: tab } : {}),
  });
  const setStatus = useContactStatus();

  const expand = (contact: ContactRow): void => {
    const next = openId === contact.id ? null : contact.id;
    setOpenId(next);
    if (next && contact.status === 'new') {
      setStatus.mutate({ id: contact.id, status: 'read' });
    }
  };

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={data ? `${data.meta.total} message(s) in this view` : 'Loading…'}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
            aria-pressed={tab === value}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              tab === value
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-white text-brand-navy hover:border-brand-navy',
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nothing here" description="Messages from the contact form land in New." icon={<Mail />} />
      ) : (
        <ul className="space-y-2">
          {data.items.map((contact) => {
            const open = openId === contact.id;

            return (
              <li
                key={contact.id}
                className={cn(
                  'rounded-lg border bg-white transition-colors',
                  contact.status === 'new' ? 'border-brand-cyan/50' : 'border-border',
                )}
              >
                <button
                  type="button"
                  onClick={() => expand(contact)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {contact.status === 'new' ? (
                    <Mail className="size-4 shrink-0 text-brand-cyan" aria-hidden />
                  ) : (
                    <MailOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-sm',
                          contact.status === 'new' ? 'font-bold text-brand-navy' : 'font-medium text-foreground',
                        )}
                      >
                        {contact.subject}
                      </span>
                      <Badge variant={contact.status === 'responded' ? 'success' : 'muted'}>
                        {contact.status}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
                      {contact.name} · {contact.email} · {formatDate(contact.createdAt)}
                    </span>
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-border p-4">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{contact.message}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild variant="cta" size="sm">
                        <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`}>
                          <Reply />
                          Reply by email
                        </a>
                      </Button>
                      {contact.phone ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={`tel:${contact.phone}`}>
                            <Phone />
                            {contact.phone}
                          </a>
                        </Button>
                      ) : null}
                      {contact.status !== 'responded' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          isLoading={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate(
                              { id: contact.id, status: 'responded' },
                              { onSuccess: () => toast.success('Marked as responded') },
                            )
                          }
                        >
                          Mark responded
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}
    </>
  );
}
