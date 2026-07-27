'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Table primitives plus a small sortable/paginated wrapper. */

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('bg-brand-navy', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-border bg-white', className)} {...props} />
  ),
);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('transition-colors hover:bg-surface', className)} {...props} />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-2xs font-semibold uppercase tracking-wide text-white',
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';

/* ----------------------------- Sortable table ---------------------------- */

export interface Column<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

export type SortDirection = 'asc' | 'desc';

/**
 * Client-side sortable table for modest datasets (admin panels, spec tables).
 * Server-paginated lists pass `onSort` and sort upstream instead.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'Nothing to show yet.',
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  className?: string;
}): JSX.Element {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [direction, setDirection] = React.useState<SortDirection>('asc');

  const sorted = React.useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === 'number' && typeof right === 'number') {
        return direction === 'asc' ? left - right : right - left;
      }
      const result = String(left ?? '').localeCompare(String(right ?? ''));
      return direction === 'asc' ? result : -result;
    });
  }, [rows, sortKey, direction]);

  const toggle = (key: string): void => {
    if (sortKey === key) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <tr>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
              aria-sort={sortKey === column.key ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {column.sortable ? (
                <button
                  type="button"
                  onClick={() => toggle(column.key)}
                  className="inline-flex items-center gap-1 uppercase transition-colors hover:text-brand-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                >
                  {column.header}
                  {sortKey !== column.key ? (
                    <ChevronsUpDown className="size-3 opacity-60" />
                  ) : direction === 'asc' ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {sorted.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key -- rows may lack a stable id in mock data
          <TableRow key={index}>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
              >
                {column.render ? column.render(row) : String(row[column.key] ?? '')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
