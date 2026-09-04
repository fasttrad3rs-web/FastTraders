'use client';

import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/admin/primitives';
import type { AdminProduct } from '@/lib/api/admin';
import { useProductMutations } from '@/lib/api/admin';

/**
 * The two ways to remove a product, kept deliberately distinct.
 *
 * The admin used to offer only the first. "Deactivate" hides a product from the
 * storefront and keeps the record, which is right for something the shop has
 * stopped carrying but customers have asked about. It is wrong for a mistyped
 * SKU or a product created while testing — those stayed in the catalogue
 * forever, because nothing could actually remove them.
 *
 * The wording of each dialog carries the whole distinction. Both are red
 * buttons; only one of them is undoable, and the operator has to be able to
 * tell which without having learned the difference the hard way.
 */
export function ProductDeleteDialogs({
  deactivating,
  purging,
  onClose,
}: {
  deactivating: AdminProduct | null;
  purging: AdminProduct | null;
  onClose: () => void;
}): JSX.Element {
  const mutations = useProductMutations();

  return (
    <>
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && onClose()}
        title="Hide this product from the storefront?"
        description={`"${deactivating?.name ?? ''}" stops appearing on the site. Nothing is lost — past inquiries still show it, and you can switch it back on at any time with the Active toggle.`}
        confirmLabel="Hide it"
        destructive
        isLoading={mutations.remove.isPending}
        onConfirm={() => {
          if (!deactivating) return;
          mutations.remove.mutate(deactivating.id, {
            onSuccess: () => toast.success('Product hidden from the storefront'),
            onError: (error) => toast.error('Could not hide it', { description: error.message }),
          });
          onClose();
        }}
      />

      <ConfirmDialog
        open={purging !== null}
        onOpenChange={(open) => !open && onClose()}
        title="Permanently delete this product?"
        description={`"${purging?.name ?? ''}" and its photographs will be erased from the database and from Cloudinary. This cannot be undone. If a customer has ever inquired about it, the deletion will be refused — hide it instead.`}
        confirmLabel="Delete permanently"
        destructive
        isLoading={mutations.purge.isPending}
        onConfirm={() => {
          if (!purging) return;
          mutations.purge.mutate(purging.id, {
            onSuccess: (result) => toast.success(`"${result.name}" deleted`),
            /*
             * The server refuses when inquiry history exists, and its message
             * explains why and what to do instead. Surfacing it verbatim is the
             * point — a generic "Could not delete" would leave the operator
             * clicking the same button again.
             */
            onError: (error) =>
              toast.error('Not deleted', { description: error.message, duration: 8000 }),
          });
          onClose();
        }}
      />
    </>
  );
}
