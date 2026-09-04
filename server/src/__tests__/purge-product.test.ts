/*
 * Held in a variable rather than reached for as `InquiryList.updateMany` at the
 * assertion. `@typescript-eslint/unbound-method` objects to referencing a method
 * detached from its object, and a cast does not satisfy it. The `mock` prefix is
 * what lets jest's hoisting allow this reference inside the factory below.
 */
const mockUpdateMany = jest.fn();

jest.mock('../models', () => ({
  Product: { findById: jest.fn() },
  Brand: { exists: jest.fn() },
  Category: { exists: jest.fn(), findById: jest.fn() },
  Inquiry: { countDocuments: jest.fn() },
  InquiryList: { countDocuments: jest.fn(), updateMany: mockUpdateMany },
}));
jest.mock('../services/upload.service', () => ({ deleteImage: jest.fn() }));

import { Inquiry, InquiryList, Product } from '../models';
import { deleteImage } from '../services/upload.service';
import { purgeProduct } from '../services/product.admin.service';

/**
 * Permanent deletion, and the one thing it must never do.
 *
 * The admin had no way to remove a product at all — the `⋯` menu's only
 * destructive action set `isActive: false`, exactly as the row toggle does, so
 * a mistyped SKU or a product created while testing stayed in the catalogue
 * forever.
 *
 * Adding a real delete means adding the guard that makes it safe. An inquiry
 * line records what a customer asked for and what was quoted; deleting the
 * product beneath it leaves that row pointing at nothing, and the inquiry
 * history is the accumulated commercial value of this system.
 */

const ID = '507f1f77bcf86cd799439011';

function product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Test product',
    images: [{ publicId: 'fast-traders/a' }, { publicId: 'fast-traders/b' }],
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('purgeProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Product.findById as jest.Mock).mockResolvedValue(product());
    (Inquiry.countDocuments as jest.Mock).mockResolvedValue(0);
    (InquiryList.countDocuments as jest.Mock).mockResolvedValue(0);
    mockUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    (deleteImage as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes the document and its Cloudinary images', async () => {
    const doc = product();
    (Product.findById as jest.Mock).mockResolvedValue(doc);

    const result = await purgeProduct(ID);

    expect(deleteImage).toHaveBeenCalledTimes(2);
    expect(doc.deleteOne as jest.Mock).toHaveBeenCalled();
    expect(result).toEqual({ name: 'Test product', images: 2 });
  });

  it('refuses when the product appears in an inquiry', async () => {
    (Inquiry.countDocuments as jest.Mock).mockResolvedValue(3);

    await expect(purgeProduct(ID)).rejects.toThrow(/cannot be deleted/);
  });

  it('leaves the document completely untouched when it refuses', async () => {
    const doc = product();
    (Product.findById as jest.Mock).mockResolvedValue(doc);
    (Inquiry.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(purgeProduct(ID)).rejects.toThrow();

    // Refusing after destroying the images would be the worst of both.
    expect(deleteImage).not.toHaveBeenCalled();
    expect(doc.deleteOne as jest.Mock).not.toHaveBeenCalled();
  });

  it('names the alternative, so the operator is not simply stopped', async () => {
    (Inquiry.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(purgeProduct(ID)).rejects.toThrow(/Active toggle/);
  });

  it('counts one inquiry with correct grammar', async () => {
    (Inquiry.countDocuments as jest.Mock).mockResolvedValue(1);

    await expect(purgeProduct(ID)).rejects.toThrow(/appears in 1 inquiry and/);
  });

  it('pulls the item out of open shortlists rather than refusing', async () => {
    // A visitor's shortlist is a basket in progress, not a record of anything.
    (InquiryList.countDocuments as jest.Mock).mockResolvedValue(2);


    await expect(purgeProduct(ID)).resolves.toBeDefined();
    expect(mockUpdateMany).toHaveBeenCalled();
  });

  it('still deletes the product when Cloudinary refuses', async () => {
    // A file left in storage costs a fraction of a cent. A product that cannot
    // be deleted because of it costs the operator their afternoon.
    const doc = product();
    (Product.findById as jest.Mock).mockResolvedValue(doc);
    (deleteImage as jest.Mock).mockRejectedValue(new Error('cloudinary down'));

    await expect(purgeProduct(ID)).resolves.toBeDefined();
    expect(doc.deleteOne as jest.Mock).toHaveBeenCalled();
  });

  it('404s on a product that is not there', async () => {
    (Product.findById as jest.Mock).mockResolvedValue(null);

    await expect(purgeProduct(ID)).rejects.toThrow(/not found/i);
  });
});
