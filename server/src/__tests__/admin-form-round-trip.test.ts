import {
  createProductSchema,
  updateProductSchema,
} from '../validators/admin.catalog.validators';
import { updateSettingsSchema } from '../validators/admin.ops.validators';

/**
 * What the admin form sends must be what the API accepts and stores.
 *
 * The reported symptom was that picking "Ready Stock" saved as "Available on
 * Order". The cause was not validation and not the database: `toApiPayload`
 * on the client never read `availability`, so it was absent from the request
 * and Mongoose applied its schema default. `leadTime` and `datasheets` were
 * missing the same way.
 *
 * A dropped field is invisible from every side — the form looks right, the
 * request succeeds, the toast is green. These tests pin the server half of the
 * contract; `scripts/verify/catalog-pivot.cjs` pins the client half by diffing
 * the form schema against the payload builder.
 */

const BASE = {
  name: 'Terasaki S250-NJ MCCB',
  sku: 'TER-S250NJ',
  description: 'A description long enough to satisfy the ten character minimum.',
  category: '507f1f77bcf86cd799439011',
  brand: '507f1f77bcf86cd799439012',
};

describe('product create accepts every field the form sends', () => {
  it('keeps a chosen availability instead of falling back to the default', () => {
    const result = createProductSchema.safeParse({
      ...BASE,
      availability: 'ready_stock',
      stock: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.availability).toBe('ready_stock');
  });

  it('rejects ready stock with nothing on the shelf', () => {
    // The form mirrors this refine so the message lands on the right input.
    const result = createProductSchema.safeParse({ ...BASE, availability: 'ready_stock', stock: 0 });

    expect(result.success).toBe(false);
  });

  it('accepts a lead time, and accepts null for an empty box', () => {
    expect(createProductSchema.safeParse({ ...BASE, leadTime: '2-3 days' }).success).toBe(true);
    expect(createProductSchema.safeParse({ ...BASE, leadTime: null }).success).toBe(true);
  });

  it('accepts hand-entered datasheet rows', () => {
    const result = createProductSchema.safeParse({
      ...BASE,
      datasheets: [{ title: 'S250-NJ catalogue', url: 'https://example.com/s250.pdf' }],
    });

    expect(result.success).toBe(true);
    // `manual` marks a row with no Cloudinary upload behind it.
    if (result.success) expect(result.data.datasheets[0]?.publicId).toBe('manual');
  });

  it('still refuses an import item with no lead time', () => {
    expect(createProductSchema.safeParse({ ...BASE, isImportItem: true }).success).toBe(false);
  });
});

describe('product edit can change availability and clear a lead time', () => {
  it('takes availability on its own', () => {
    const result = updateProductSchema.safeParse({ availability: 'import_on_request' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.availability).toBe('import_on_request');
  });

  it('treats null lead time as "remove", not as invalid', () => {
    const result = updateProductSchema.safeParse({ leadTime: null });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.leadTime).toBeNull();
  });

  it('accepts a datasheet list, including an emptied one', () => {
    expect(updateProductSchema.safeParse({ datasheets: [] }).success).toBe(true);
  });

  it('accepts a stock figure — the "Stock on hand" box is not decorative', () => {
    // Zod strips unknown keys silently, so while `stock` was missing from this
    // schema the typed figure vanished with a 200 response and no warning.
    const result = updateProductSchema.safeParse({ stock: 10 });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock).toBe(10);
  });

  it('carries stock and availability together, which is what the form sends', () => {
    /*
     * The two must travel in one request. Applying availability while dropping
     * stock left the product at zero, and `demoteEmptyReadyStock` then undid
     * the operator's choice — a rule enforcing an invariant on a number the
     * same save had tried to correct.
     */
    const result = updateProductSchema.safeParse({ availability: 'ready_stock', stock: 10 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.availability).toBe('ready_stock');
      expect(result.data.stock).toBe(10);
    }
  });
});

describe('settings fields can be emptied, not only filled', () => {
  it('clears a landline with null', () => {
    const result = updateSettingsSchema.safeParse({ landline: null });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.landline).toBeNull();
  });

  it('clears a social link with null', () => {
    expect(updateSettingsSchema.safeParse({ social: { facebook: null } }).success).toBe(true);
  });

  it('removes the whole bank block with null', () => {
    // These details print on quotations. A stale account number is the one
    // setting on this screen that can cost money to get wrong.
    const result = updateSettingsSchema.safeParse({ bankDetails: null });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bankDetails).toBeNull();
  });

  it('still rejects a half-filled bank block', () => {
    expect(updateSettingsSchema.safeParse({ bankDetails: { bankName: 'HBL' } }).success).toBe(false);
  });
});
