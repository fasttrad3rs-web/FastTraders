import { updateProductSchema } from '../validators/admin.catalog.validators';

/**
 * Reactivating a product must not disturb anything else about it.
 *
 * The worry was that toggling Active off and on again lost the flags chosen
 * when the product was created — so it came back on its own page but not in
 * the homepage rails it used to appear in. It does not: the table toggle sends
 * only `{ isActive }`, and `updateProduct` walks the *provided* keys with
 * `product.set(...)`, so `isFeatured`, `isNewArrival` and `isBestSeller` are
 * never touched.
 *
 * (The real cause of that symptom was cache staleness, not data loss — see
 * `revalidate.service.ts`. These tests exist so a future change to the update
 * path cannot quietly make the original worry true.)
 */

describe('the Active toggle is a one-field patch', () => {
  it('accepts a patch containing only isActive', () => {
    const result = updateProductSchema.safeParse({ isActive: true });

    expect(result.success).toBe(true);
    if (result.success) {
      // Nothing else may be conjured into the payload — a default here would
      // silently overwrite a flag the operator set at creation.
      expect(Object.keys(result.data)).toEqual(['isActive']);
    }
  });

  it('does not invent isFeatured, isNewArrival or isBestSeller', () => {
    const result = updateProductSchema.safeParse({ isActive: false });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as Record<string, unknown>;
      expect(data.isFeatured).toBeUndefined();
      expect(data.isNewArrival).toBeUndefined();
      expect(data.isBestSeller).toBeUndefined();
      expect(data.availability).toBeUndefined();
    }
  });

  it('still lets the flags be set deliberately', () => {
    const result = updateProductSchema.safeParse({
      isActive: true,
      isFeatured: true,
      isNewArrival: true,
      isBestSeller: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeatured).toBe(true);
      expect(result.data.isNewArrival).toBe(true);
      expect(result.data.isBestSeller).toBe(false);
    }
  });
});
