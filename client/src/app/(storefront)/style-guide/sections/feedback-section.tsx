'use client';

import { useState } from 'react';
import { Info, PackageSearch } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  SheetContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/tooltip';
import {
  EmptyState,
  ErrorState,
  ProductCardSkeleton,
  Skeleton,
  Spinner,
  TableSkeleton,
} from '@/components/ui/feedback';
import { SectionHeading } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';

export function FeedbackSection(): JSX.Element {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section id="feedback" className="scroll-mt-24">
      <SectionHeading title="Feedback & overlays" />

      <div className="space-y-8">
        <div className="grid gap-3 lg:grid-cols-2">
          <Alert variant="info" title="Price on request">
            This item is quote-only. Add it to your inquiry list and we will price it for you.
          </Alert>
          <Alert variant="success" title="Order confirmed">
            Order FT-202607-0042 has been placed. A confirmation email is on its way.
          </Alert>
          <Alert variant="warning" title="Only 3 left in stock">
            Order soon, or request a quote for a larger quantity.
          </Alert>
          <Alert variant="danger" title="Payment failed">
            We could not take the payment. Please try another method or pay on delivery.
          </Alert>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Toasts, tooltips and menus
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => toast.success('Added to cart', { description: '2 × Schneider LC1D18M7' })}>
              Success toast
            </Button>
            <Button variant="outline" onClick={() => toast.error('Out of stock', { description: 'Only 3 remaining.' })}>
              Error toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast('Quotation sent', {
                  description: 'FTQ-202607-0017 emailed to the customer.',
                  action: { label: 'View', onClick: () => undefined },
                })
              }
            >
              Toast with action
            </Button>

            <Tooltip content="Trade buyers can paste a part number here">
              <Button variant="ghost">
                <Info />
                Hover me
              </Button>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuItem>Newest first</DropdownMenuItem>
                <DropdownMenuItem>Price: low to high</DropdownMenuItem>
                <DropdownMenuItem>Best selling</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Reset</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="primary">Open modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a bulk price</DialogTitle>
                  <DialogDescription>
                    Send us the quantity you need and we will come back with a trade price within
                    one working day.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button variant="cta">Send request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
              <Button variant="outline" onClick={() => setSheetOpen(true)}>
                Open drawer
              </Button>
              <SheetContent side="right">
                <div className="border-b border-border p-5">
                  <DialogTitle>Your cart</DialogTitle>
                </div>
                <div className="flex-1 p-5 text-sm text-muted-foreground">
                  The cart drawer uses the same primitive as the mobile menu — one Radix root,
                  two presentations.
                </div>
                <div className="border-t border-border p-5">
                  <Button variant="cta" block>
                    Checkout
                  </Button>
                </div>
              </SheetContent>
            </Dialog>
          </div>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Loading states
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProductCardSkeleton />
            <div className="space-y-3 rounded-lg border border-border bg-white p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <TableSkeleton rows={4} />
            </div>
            <div className="flex items-center justify-center rounded-lg border border-border bg-white p-4">
              <Spinner />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState
            title="No products match those filters"
            description="Try widening the price range or clearing a brand filter."
            icon={<PackageSearch />}
            action={<Button variant="outline" size="sm">Clear all filters</Button>}
          />
          <ErrorState onRetry={() => toast('Retrying…')} />
        </div>
      </div>
    </section>
  );
}
