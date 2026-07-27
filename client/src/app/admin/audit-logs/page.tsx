'use client';

import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminList } from '@/lib/api/admin-resources';
import { formatDate } from '@/lib/utils';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string;
  at: string;
  actor?: { name?: string; email?: string } | string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

const ACTION_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  create: 'success',
  update: 'default',
  delete: 'danger',
  status_change: 'warning',
  login: 'muted',
  logout: 'muted',
};

const ENTITIES = ['all', 'Product', 'Order', 'Quotation', 'User', 'Category', 'Brand', 'Setting', 'Review'];

/** Append-only activity feed. Entries expire after two years via a TTL index. */
export default function AdminAuditLogsPage(): JSX.Element {
  const [entity, setEntity] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isPending } = useAdminList<AuditRow>('audit-logs', {
    page,
    limit: 30,
    ...(entity !== 'all' ? { entity } : {}),
  });

  const actorName = (actor: AuditRow['actor']): string => {
    if (!actor) return 'System';
    if (typeof actor === 'string') return 'Staff member';
    return actor.name ?? actor.email ?? 'Staff member';
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin mutation, with the actor and IP. Sensitive fields are redacted from snapshots."
        actions={
          <Select value={entity} onValueChange={(value) => { setEntity(value); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by entity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === 'all' ? 'All entities' : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isPending ? (
        <TableSkeleton rows={10} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No activity recorded" description="Admin actions appear here as they happen." icon={<ScrollText />} />
      ) : (
        <>
          <ol className="space-y-2">
            {data.items.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ACTION_VARIANT[entry.action] ?? 'muted'}>
                    {entry.action.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm font-medium text-brand-navy">{entry.entity}</span>
                  <span className="font-mono text-2xs text-muted-foreground">{entry.entityId}</span>
                  <span className="ml-auto text-2xs text-muted-foreground">{formatDate(entry.at)}</span>
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  {actorName(entry.actor)}
                  {entry.ip ? ` · ${entry.ip}` : ''}
                </p>

                {entry.after && Object.keys(entry.after).length > 0 ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-2xs font-medium text-brand-cyan">
                      View change
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-surface p-3 font-mono text-[10px] leading-relaxed text-foreground">
                      {JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>

          {data.meta.totalPages > 1 ? (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} className="mt-6" />
          ) : null}
        </>
      )}
    </>
  );
}
