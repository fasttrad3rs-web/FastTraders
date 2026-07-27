'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';

/**
 * Wishlist.
 *
 * There is no wishlist model or endpoint in the API yet (Phase 2 defined 15
 * models and this was not among them). Rather than fake it with localStorage
 * and quietly lose the data on a new device, the screen states the position
 * and points at the inquiry list, which already does the "save for later" job
 * for trade buyers.
 */
export default function WishlistPage(): JSX.Element {
  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        Wishlist
      </h1>

      <Alert variant="info" title="Not available yet" className="mt-4">
        The wishlist needs a saved-items model on the API, which is not built yet. In the meantime
        your <strong>inquiry list</strong> does the same job and survives across devices once you
        are signed in.
      </Alert>

      <EmptyState
        className="mt-5"
        title="Nothing saved"
        description="Use the inquiry list to keep products together and request a price when you are ready."
        icon={<Heart />}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="cta" size="sm">
              <Link href="/inquiry">Open my inquiry list</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
