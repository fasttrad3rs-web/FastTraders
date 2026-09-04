'use client';

import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableSkeleton } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { PageHeader } from '@/components/admin/primitives';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { STATUS_LABELS, TYPE_LABELS } from '@/components/admin/inquiries/status';
import { StatusTabs } from '@/components/admin/inquiries/status-tabs';
import { InquiryRow } from '@/components/admin/inquiries/inquiry-row';
import { BulkBar } from '@/components/admin/inquiries/bulk-bar';
import {
  useInquiries,
  useInquiryMutations,
  type BulkInquiryInput,
} from '@/lib/api/inquiries';
import { useAdminStats, useStaff } from '@/lib/api/admin';
import { env } from '@/lib/env';

/**
 * The inquiry pipeline — the screen this business is run from.
 *
 * Sorted newest first by default, because an inquiry that arrived this
 * morning is worth more than one from Tuesday. The phone number is a column
 * rather than buried in the detail view: staff recognise a caller by number,
 * and it is the one thing they need before picking up.
 */

const ALL = 'all';

export default function AdminInquiriesPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [priority, setPriority] = useState<string>(ALL);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [selected, setSelected] = useState<string[]>([]);

  const mutations = useInquiryMutations();
  const stats = useAdminStats();
  const staff = useStaff();

  const { data, isPending } = useInquiries({
    page,
    limit: 25,
    sort,
    ...(search ? { search } : {}),
    ...(status !== ALL ? { status } : {}),
    ...(type !== ALL ? { type } : {}),
    ...(priority !== ALL ? { priority } : {}),
  });

  const allSelected = data !== undefined && data.items.length > 0 && selected.length === data.items.length;

  /**
   * One request for the whole selection, then clear it. Clearing matters:
   * leaving rows ticked after a status change means the next action lands on
   * inquiries that have already moved out of the tab being looked at.
   */
  const applyBulk = (changes: Omit<BulkInquiryInput, 'ids'>): void => {
    mutations.bulk.mutate(
      { ids: selected, ...changes },
      {
        onSuccess: (result) => {
          toast.success(`${result.modified} inquiry/inquiries updated`);
          setSelected([]);
        },
        onError: (error) => toast.error('Bulk update failed', { description: error.message }),
      },
    );
  };

  /*
   * The export follows the screen. Downloading "all inquiries" while looking
   * at a filtered tab is the kind of surprise that ends with somebody mailing
   * the wrong list to a supplier.
   */
  const exportUrl = (() => {
    const params = new URLSearchParams();
    if (status !== ALL) params.set('status', status);
    if (type !== ALL) params.set('type', type);
    if (priority !== ALL) params.set('priority', priority);
    if (search) params.set('search', search);
    const query = params.toString();
    return `${env.NEXT_PUBLIC_API_URL}/admin/inquiries/export${query ? `?${query}` : ''}`;
  })();

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Every request, and what happened next."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={exportUrl}>
              <Download />
              Export CSV
            </a>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Name, phone, company or FT-INQ number"
            className="pl-9"
            aria-label="Search inquiries"
          />
        </div>

        <FilterSelect
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          label="Status"
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <FilterSelect
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
          label="Type"
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />

        <FilterSelect
          value={priority}
          onChange={(value) => {
            setPriority(value);
            setPage(1);
          }}
          label="Priority"
          options={[
            { value: 'high', label: 'High' },
            { value: 'normal', label: 'Normal' },
            { value: 'low', label: 'Low' },
          ]}
        />

        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="h-10 w-[150px]" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No inquiries match"
          description="Try clearing a filter, or widen the search."
        />
      ) : (
        <>
          <StatusTabs
            value={status}
            total={stats.data ? stats.data.inquiries.total : (data.meta.total ?? 0)}
            counts={stats.data?.byStatus ?? {}}
            onChange={(next) => {
              setStatus(next);
              setSelected([]);
              setPage(1);
            }}
          />

          <BulkBar
            count={selected.length}
            staff={(staff.data ?? []).map((person) => ({ id: person.id, name: person.name }))}
            isSaving={mutations.bulk.isPending}
            onClear={() => setSelected([])}
            onAssign={(userId) => applyBulk({ assignedTo: userId })}
            onStatus={(next) => applyBulk({ status: next })}
          />

          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked === true ? data.items.map((row) => row.id) : [])
                      }
                      aria-label="Select every inquiry on this page"
                    />
                  </TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Chase</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.items.map((inquiry) => (
                  <InquiryRow
                    key={inquiry.id}
                    inquiry={inquiry}
                    selected={selected.includes(inquiry.id)}
                    onSelect={(id, next) =>
                      setSelected((current) =>
                        next ? [...current, id] : current.filter((item) => item !== id),
                      )
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            className="mt-4"
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}): JSX.Element {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-[165px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
