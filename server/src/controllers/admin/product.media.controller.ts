import type { Request, Response } from 'express';
import { Product } from '../../models';
import { recordAudit } from '../../services/audit.service';
import { exportProducts } from '../../services/product.export.service';
import { importProducts } from '../../services/product.import.service';
import { deleteImage, uploadBuffers } from '../../services/upload.service';
import { ApiError } from '../../utils/ApiError';
import { sendCreated, sendSuccess } from '../../utils/ApiResponse';
import type { SheetFormat } from '../../services/sheet.service';

/** Product images, datasheets, and spreadsheet import/export. */

export async function uploadImages(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const files = req.files;

  if (!Array.isArray(files) || files.length === 0) {
    throw ApiError.badRequest('Attach at least one image in the `images` field');
  }

  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const uploaded = await uploadBuffers(files, 'products');

  product.images.push(
    ...uploaded.map((image, index) => ({
      url: image.url,
      publicId: image.publicId,
      alt: product.name,
      // The very first image on a bare product becomes the primary.
      isPrimary: product.images.length === 0 && index === 0,
    })),
  );
  await product.save();

  recordAudit({
    req,
    action: 'update',
    entity: 'Product',
    entityId: id,
    after: { addedImages: uploaded.map((image) => image.publicId) },
  });

  sendCreated(res, product.images, `${uploaded.length} image(s) uploaded`);
}

export async function removeImage(req: Request, res: Response): Promise<void> {
  const { id, publicId } = req.params as { id: string; publicId: string };
  const decoded = decodeURIComponent(publicId);

  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const image = product.images.find((item) => item.publicId === decoded);
  if (!image) throw ApiError.notFound('That image is not on this product');

  product.images = product.images.filter((item) => item.publicId !== decoded);
  // Promote a replacement primary so the card never renders blank.
  if (image.isPrimary && product.images[0]) product.images[0].isPrimary = true;
  await product.save();

  // Cloudinary cleanup is best-effort; the record is what the storefront reads.
  await deleteImage(decoded).catch(() => undefined);

  recordAudit({ req, action: 'update', entity: 'Product', entityId: id, after: { removedImage: decoded } });

  sendSuccess(res, product.images, 'Image removed');
}

export async function importFromSheet(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw ApiError.badRequest('Attach a CSV or XLSX file in the `file` field');

  const { dryRun } = req.query as { dryRun?: string };
  const preview = dryRun === 'true' || dryRun === '1';

  const report = await importProducts(file.buffer, preview);

  if (!preview) {
    recordAudit({
      req,
      action: 'create',
      entity: 'Product',
      entityId: `import:${report.totalRows}`,
      after: { created: report.created, updated: report.updated, skipped: report.skipped },
    });
  }

  const summary = preview
    ? `Dry run: ${report.created} would be created, ${report.updated} updated, ${report.skipped} skipped`
    : `${report.created} created, ${report.updated} updated, ${report.skipped} skipped`;

  sendSuccess(res, report, summary);
}

export async function exportToSheet(req: Request, res: Response): Promise<void> {
  const { format, isActive, category, brand } = req.query as unknown as {
    format: SheetFormat;
    isActive?: boolean;
    category?: string;
    brand?: string;
  };

  const file = await exportProducts(
    {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
    },
    format,
  );

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}
