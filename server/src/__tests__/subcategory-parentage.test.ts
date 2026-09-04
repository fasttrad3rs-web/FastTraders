jest.mock('../models', () => ({
  Product: { exists: jest.fn(), findById: jest.fn(), find: jest.fn(), create: jest.fn() },
  Brand: { exists: jest.fn().mockResolvedValue(true) },
  Category: { exists: jest.fn(), findById: jest.fn() },
}));

import { Types } from 'mongoose';
import { Brand, Category, Product } from '../models';
import { createProduct } from '../services/product.admin.service';

/**
 * A sub-category must be a CHILD of the category it is filed under.
 *
 * The admin form offered every nested category regardless of parent, so a
 * product could be saved as Control Components + Sensors — and Sensors lives
 * under Automation. Nothing rejected it. The product then appeared under
 * neither: the category page had no chip for it, and the sub-category filter
 * matched nothing. It looked like the fields chosen at creation had been
 * thrown away, when in fact they had been stored exactly as entered and were
 * simply contradictory.
 *
 * The form now only offers valid children. This is the backstop for the CSV
 * importer and for anything talking to the API directly.
 */

const CONTROL_COMPONENTS = new Types.ObjectId().toString();
const AUTOMATION = new Types.ObjectId().toString();
const SENSORS = new Types.ObjectId().toString();
const CONTACTORS = new Types.ObjectId().toString();

const PARENTS: Record<string, { parent: string | null; name: string }> = {
  [CONTROL_COMPONENTS]: { parent: null, name: 'Control Components' },
  [AUTOMATION]: { parent: null, name: 'Automation' },
  [SENSORS]: { parent: AUTOMATION, name: 'Sensors' },
  [CONTACTORS]: { parent: CONTROL_COMPONENTS, name: 'Contactors' },
};

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Test product',
    sku: 'TST-1',
    description: 'A description long enough to pass validation.',
    category: CONTROL_COMPONENTS,
    brand: new Types.ObjectId().toString(),
    ...overrides,
  };
}

describe('sub-category parentage', () => {
  beforeEach(() => {
    (Product.exists as jest.Mock).mockResolvedValue(false);
    (Brand.exists as jest.Mock).mockResolvedValue(true);
    (Category.exists as jest.Mock).mockResolvedValue(true);

    (Category.findById as jest.Mock).mockImplementation((id: string) => ({
      select: () => ({ lean: () => Promise.resolve(PARENTS[id] ?? null) }),
    }));

    // `uniqueSlug` fetches sibling slugs before creating; no collisions here.
    (Product.find as jest.Mock).mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([]) }),
    });

    (Product as unknown as { create: jest.Mock }).create = jest
      .fn()
      .mockResolvedValue({ _id: new Types.ObjectId() });
  });

  it('rejects a sub-category belonging to a different parent', async () => {
    // The exact pairing that shipped: Control Components + Sensors.
    await expect(
      createProduct(base({ subCategory: SENSORS }) as never),
    ).rejects.toThrow(/not a sub-category of the category you selected/);
  });

  it('names the offending sub-category, so the message is actionable', async () => {
    await expect(createProduct(base({ subCategory: SENSORS }) as never)).rejects.toThrow(
      /Sensors/,
    );
  });

  it('accepts a genuine child of the chosen category', async () => {
    await expect(
      createProduct(base({ subCategory: CONTACTORS }) as never),
    ).resolves.toBeDefined();
  });

  it('accepts no sub-category at all — it is optional', async () => {
    await expect(createProduct(base() as never)).resolves.toBeDefined();
  });

  it('still rejects a sub-category that does not exist', async () => {
    await expect(
      createProduct(base({ subCategory: new Types.ObjectId().toString() }) as never),
    ).rejects.toThrow(/does not exist/);
  });
});
