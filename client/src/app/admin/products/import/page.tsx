import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/primitives';
import { ImportPanel } from '@/components/admin/products/import-panel';

/**
 * Bulk product import.
 *
 * The products screen has linked here since Phase 4 and the route did not
 * exist, so "Import CSV" was a 404. The server side was complete the whole
 * time — parser, validation, dry run, per-row issue report.
 *
 * This matters more than a normal dead link: replacing the 50 seeded demo
 * products with Sharjeel's real stock list is a launch blocker, and doing that
 * by hand through the seven-tab form is not realistic.
 */
export default function ProductImportPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Import products"
        description="Add or update many products at once from a spreadsheet."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products">
              <ArrowLeft />
              Back to products
            </Link>
          </Button>
        }
      />

      <ImportPanel />
    </>
  );
}
