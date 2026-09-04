'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Phone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/admin/primitives';
import { PriorityBadge, StatusBadge, TYPE_LABELS } from '@/components/admin/inquiries/status';
import { ActionPanel } from '@/components/admin/inquiries/action-panel';
import { InquiryBody } from '@/components/admin/inquiries/inquiry-body';
import { FollowUps } from '@/components/admin/inquiries/follow-ups';
import { useInquiry, useInquiryMutations } from '@/lib/api/inquiries';
import { formatDate } from '@/lib/utils';
import type { InquiryPriority, InquiryStatus, InquiryType } from '@/types';

/**
 * One inquiry, and the working surface for it.
 *
 * The layout puts the customer's number and the item lines side by side with
 * the internal cost, because the job on this screen is a phone call where
 * someone has to say a price out loud. Everything else is secondary.
 */
export default function AdminInquiryDetailPage({
  params,
}: {
  params: { id: string };
}): JSX.Element {
  const { data: inquiry, isPending } = useInquiry(params.id);
  const mutations = useInquiryMutations();

  const [note, setNote] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  if (isPending || !inquiry) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const patch = (body: Parameters<typeof mutations.update.mutate>[0]['patch']): void => {
    mutations.update.mutate(
      { id: inquiry.id, patch: body },
      {
        onSuccess: () => toast.success('Inquiry updated'),
        onError: (error) => toast.error('Could not update', { description: error.message }),
      },
    );
  };

  const whatsapp = (inquiry.customer.whatsapp ?? inquiry.customer.phone).replace(/\D/g, '');

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/admin/inquiries">
          <ArrowLeft />
          All inquiries
        </Link>
      </Button>

      <PageHeader
        title={inquiry.inquiryNumber}
        description={`${TYPE_LABELS[inquiry.type as InquiryType]} · received ${formatDate(inquiry.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={inquiry.status as InquiryStatus} />
            <PriorityBadge priority={inquiry.priority as InquiryPriority} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* -------------------------- Customer ------------------------- */}
          <Card className="p-5">
            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Customer
            </h2>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={`tel:${inquiry.customer.phone}`}>
                  <Phone />
                  {inquiry.customer.phone}
                </a>
              </Button>
              <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1da851]">
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
              {inquiry.customer.email ? (
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${inquiry.customer.email}`}>Email</a>
                </Button>
              ) : null}
            </div>

            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row label="Name" value={inquiry.customer.name} />
              <Row label="Company" value={inquiry.customer.company} />
              <Row label="Designation" value={inquiry.customer.designation} />
              <Row label="City" value={inquiry.customer.city} />
              <Row label="Email" value={inquiry.customer.email} />
              <Row label="Prefers" value={inquiry.preferredContactMethod} />
              <Row label="Best time" value={inquiry.preferredContactTime} />
              <Row label="Source" value={inquiry.source} />
            </dl>

            {inquiry.message ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm">
                {inquiry.message}
              </p>
            ) : null}
          </Card>

          <InquiryBody inquiry={inquiry} />

          <div className="mt-4">
            <FollowUps
              inquiry={inquiry}
              isSaving={mutations.addFollowUp.isPending}
              onAdd={(body) =>
                mutations.addFollowUp.mutate(
                  { id: inquiry.id, ...body },
                  {
                    onSuccess: () => toast.success('Note added'),
                    onError: (error) => toast.error('Could not add the note', {
                      description: error.message,
                    }),
                  },
                )
              }
            />
          </div>

          {/* ------------------------- Follow-ups ------------------------ */}
          <Card className="p-5">
            <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Follow-ups
            </h2>
            <p className="mb-3 text-2xs text-muted-foreground">
              Append-only. A history you can edit is not a history.
            </p>

            {inquiry.followUps.length > 0 ? (
              <ul className="mb-4 space-y-3 border-l-2 border-border pl-4">
                {inquiry.followUps.map((followUp, index) => (
                  <li key={`${followUp.at}-${index}`} className="text-sm">
                    <p className="whitespace-pre-wrap">{followUp.note}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatDate(followUp.at)}
                      {followUp.nextFollowUpAt
                        ? ` · next chase ${formatDate(followUp.nextFollowUpAt)}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">Nobody has logged a contact yet.</p>
            )}

            <div className="space-y-2">
              <Textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What was said? e.g. Called, quoted 1.85 lac, he is checking with his boss."
                aria-label="Follow-up note"
              />
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Next chase" htmlFor="next-chase" className="w-44">
                  <Input
                    id="next-chase"
                    type="date"
                    value={nextFollowUpAt}
                    onChange={(event) => setNextFollowUpAt(event.target.value)}
                  />
                </Field>
                <Button
                  size="sm"
                  disabled={note.trim().length === 0}
                  isLoading={mutations.addFollowUp.isPending}
                  onClick={() =>
                    mutations.addFollowUp.mutate(
                      {
                        id: inquiry.id,
                        note,
                        ...(nextFollowUpAt ? { nextFollowUpAt } : {}),
                      },
                      {
                        onSuccess: () => {
                          setNote('');
                          setNextFollowUpAt('');
                          toast.success('Follow-up recorded');
                        },
                      },
                    )
                  }
                >
                  <Plus />
                  Log follow-up
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <ActionPanel inquiry={inquiry} onPatch={patch} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | null }): JSX.Element | null {
  if (!value) return null;

  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
