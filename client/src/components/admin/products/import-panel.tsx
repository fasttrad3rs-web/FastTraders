'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { apiClient, unwrap } from '@/lib/api-client';

/**
 * CSV / XLSX product import.
 *
 * The server has had a working importer with a dry-run mode since Phase 4; the
 * admin's "Import CSV" button pointed at a page that was never built, so it
 * 404'd. This is that page.
 *
 * **Dry run first, always.** The flow is deliberately two steps — upload,
 * read the report, then commit — because this is the one screen that can
 * rewrite the whole catalogue in a single click. The commit button does not
 * appear until a preview has come back clean enough to be worth committing.
 */

interface RowIssue {
  row: number;
  sku: string;
  errors: string[];
}

interface ImportReport {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  issues: RowIssue[];
  recognisedColumns: string[];
}

export function ImportPanel(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);

  const send = async (dryRun: boolean): Promise<void> => {
    if (!file) return;
    setBusy(dryRun ? 'preview' : 'commit');

    const body = new FormData();
    body.append('file', file);

    try {
      const result = unwrap(
        await apiClient.post<ImportReport>(`/admin/products/import?dryRun=${String(dryRun)}`, body),
      );
      setReport(result);

      if (!dryRun) {
        toast.success(`${result.created} created, ${result.updated} updated`);
        // Force a fresh preview before another commit — the file's effect on
        // the catalogue is different now that it has been applied once.
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (error) {
      toast.error(dryRun ? 'Could not read the file' : 'Import failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <Alert variant="info" className="text-xs">
        Rows are matched on <strong>SKU</strong>: an existing SKU is updated, a new one is created.
        Nothing is ever deleted by an import. Always run the preview first.
      </Alert>

      <div className="rounded-lg border border-border bg-white p-5">
        <label
          htmlFor="import-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center transition-colors hover:border-brand-cyan"
        >
          <FileSpreadsheet className="size-7 text-brand-cyan" aria-hidden />
          <span className="text-sm font-semibold text-brand-navy">
            {file ? file.name : 'Choose a CSV or XLSX file'}
          </span>
          <span className="text-2xs text-muted-foreground">
            {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Exported from Excel or Google Sheets'}
          </span>
        </label>
        <input
          ref={inputRef}
          id="import-file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setReport(null);
          }}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!file || busy !== null}
            isLoading={busy === 'preview'}
            onClick={() => void send(true)}
          >
            <Upload />
            Preview changes
          </Button>

          {/*
            Only offered once a preview exists. Committing a file nobody has
            looked at is how a catalogue gets quietly overwritten.
          */}
          {report?.dryRun ? (
            <Button
              variant="cta"
              size="sm"
              disabled={busy !== null || report.totalRows === report.skipped}
              isLoading={busy === 'commit'}
              onClick={() => void send(false)}
            >
              Apply {report.created + report.updated} row(s)
            </Button>
          ) : null}
        </div>
      </div>

      {report ? <ImportReportView report={report} /> : null}
    </div>
  );
}

function ImportReportView({ report }: { report: ImportReport }): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={report.dryRun ? 'accent' : 'success'}>
          {report.dryRun ? 'Preview only — nothing saved' : 'Applied'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {report.totalRows} row(s) read · {report.created} created · {report.updated} updated ·{' '}
          {report.skipped} skipped
        </span>
      </div>

      {report.issues.length > 0 ? (
        <>
          <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-destructive">
            {report.issues.length} row(s) could not be used
          </p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className="w-40">SKU</TableHead>
                  <TableHead>Problem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.issues.map((issue) => (
                  <TableRow key={`${issue.row}-${issue.sku}`}>
                    <TableCell className="tabular-nums text-xs">{issue.row}</TableCell>
                    <TableCell className="font-mono text-xs">{issue.sku || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {issue.errors.join('; ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-xs text-success-foreground">Every row parsed cleanly.</p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-2xs font-bold uppercase tracking-wide text-muted-foreground">
          Recognised columns ({report.recognisedColumns.length})
        </summary>
        <p className="mt-2 font-mono text-2xs leading-relaxed text-muted-foreground">
          {report.recognisedColumns.join(' · ')}
        </p>
      </details>
    </div>
  );
}
