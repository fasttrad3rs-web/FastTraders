'use client';

import { useState } from 'react';
import { Check, Star, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Rating } from '@/components/ui/commerce';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog, PageHeader } from '@/components/admin/primitives';
import { useAdminList, useReviewModeration } from '@/lib/api/admin-resources';
import { cn, formatDate } from '@/lib/utils';

interface ReviewRow {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user?: { name?: string } | string;
  product?: { name?: string; slug?: string } | string;
}

const named = (value: ReviewRow['user'] | ReviewRow['product']): string =>
  value && typeof value !== 'string' && 'name' in value ? (value.name ?? '') : '';

/** Moderation queue. Pending reviews first — that is the job on this screen. */
export default function AdminReviewsPage(): JSX.Element {
  const [pendingOnly, setPendingOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ReviewRow | null>(null);

  const { data, isPending } = useAdminList<ReviewRow>('reviews', {
    page,
    limit: 20,
    includePending: true,
    sort: 'newest',
  });
  const moderation = useReviewModeration();

  const rows = (data?.items ?? []).filter((review) => (pendingOnly ? !review.isApproved : true));

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approved reviews appear on the product page and count towards its rating."
        actions={
          <Button variant={pendingOnly ? 'primary' : 'outline'} size="sm" onClick={() => setPendingOnly((v) => !v)}>
            {pendingOnly ? 'Showing pending only' : 'Showing all'}
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={pendingOnly ? 'Nothing waiting for moderation' : 'No reviews yet'}
          description={pendingOnly ? 'All caught up.' : 'Reviews appear here once customers leave them.'}
          icon={<Star />}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((review) => (
            <li
              key={review.id}
              className={cn(
                'rounded-lg border bg-white p-4',
                review.isApproved ? 'border-border' : 'border-warning/50',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Rating value={review.rating} size="sm" />
                    {review.isVerifiedPurchase ? <Badge variant="success">Verified purchase</Badge> : null}
                    <Badge variant={review.isApproved ? 'success' : 'warning'}>
                      {review.isApproved ? 'Published' : 'Pending'}
                    </Badge>
                  </div>

                  {review.title ? (
                    <p className="mt-2 text-sm font-semibold text-brand-navy">{review.title}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                  <p className="mt-2 text-2xs text-muted-foreground">
                    {named(review.user) || 'Customer'} on {named(review.product) || 'a product'} ·{' '}
                    {formatDate(review.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {!review.isApproved ? (
                    <Button
                      variant="cta"
                      size="sm"
                      isLoading={moderation.approve.isPending}
                      onClick={() =>
                        moderation.approve.mutate(
                          { id: review.id, isApproved: true },
                          {
                            onSuccess: () => toast.success('Review published'),
                            onError: (error) => toast.error('Could not publish', { description: error.message }),
                          },
                        )
                      }
                    >
                      <Check />
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        moderation.approve.mutate(
                          { id: review.id, isApproved: false },
                          { onSuccess: () => toast.success('Review unpublished') },
                        )
                      }
                    >
                      <X />
                      Unpublish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setToDelete(review)}
                    aria-label="Delete review"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 ? (
        <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this review?"
        description="It is removed permanently and the product's rating is recalculated."
        confirmLabel="Delete"
        destructive
        isLoading={moderation.remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          moderation.remove.mutate(toDelete.id, { onSuccess: () => toast.success('Review deleted') });
          setToDelete(null);
        }}
      />
    </>
  );
}
