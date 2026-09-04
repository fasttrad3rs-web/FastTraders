import type { Types } from 'mongoose';
import { z } from 'zod';
import { Brand, Category, Product } from '../models';
import { uniqueSlug } from '../utils/slug';
import { parseSheet } from './sheet.service';

/**
 * CSV / XLSX product import.
 *
 * Every row is validated independently and the whole run is reported back —
 * a bad row is skipped and named, never silently dropped, and never aborts the
 * rows around it. `dryRun` lets an admin preview the report before committing.
 */

/** Accepts blank, "1", "true", "yes", "y". */
const sheetBoolean = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === '') return undefined;
    return ['1', 'true', 'yes', 'y'].includes(String(value).trim().toLowerCase());
  });

const sheetNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return undefined;
    // Tolerate "1,250" and "Rs. 1250" from hand-edited sheets.
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  })
  .refine((value) => value === undefined || !Number.isNaN(value), 'Must be a number');

const rowSchema = z.object({
  sku: z.string().trim().min(1, 'sku is required').max(60).toUpperCase(),
  name: z.string().trim().min(3, 'name is required').max(200),
  description: z.string().trim().max(20000).optional(),
  shortDescription: z.string().trim().max(400).optional(),
  partNumber: z.string().trim().max(80).optional(),
  categorySlug: z.string().trim().min(1, 'categorySlug is required'),
  subCategorySlug: z.string().trim().optional(),
  brandSlug: z.string().trim().min(1, 'brandSlug is required'),
  availability: z
    .enum(['ready_stock', 'available_on_order', 'import_on_request', 'discontinued'])
    .optional(),
  leadTime: z.string().trim().max(80).optional(),
  isImportItem: sheetBoolean,
  lastQuotedPrice: sheetNumber,
  internalCost: sheetNumber,
  supplierNotes: z.string().trim().max(2000).optional(),
  stock: sheetNumber,
  lowStockThreshold: sheetNumber,
  unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
  minOrderQty: sheetNumber,
  tags: z.string().trim().optional(),
  warranty: z.string().trim().max(120).optional(),
  /** `Key:Value|Key:Value`, matching the storefront filter syntax. */
  specifications: z.string().trim().optional(),
  isFeatured: sheetBoolean,
  isActive: sheetBoolean,
});

export interface RowIssue {
  /** 1-based row number as it appears in the spreadsheet, header excluded. */
  row: number;
  sku: string;
  errors: string[];
}

export interface ImportReport {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  issues: RowIssue[];
  /** Column headers the importer recognises, for the admin UI's help text. */
  recognisedColumns: string[];
}

export const IMPORT_COLUMNS = Object.keys(rowSchema.shape);

function parseSpecs(value?: string): { key: string; value: string }[] {
  if (!value) return [];
  return value
    .split('|')
    .map((pair) => {
      const index = pair.indexOf(':');
      if (index < 1) return null;
      return { key: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((item): item is { key: string; value: string } => item !== null && item.value !== '');
}

export async function importProducts(buffer: Buffer, dryRun: boolean): Promise<ImportReport> {
  const rows = parseSheet(buffer);
  const issues: RowIssue[] = [];
  let created = 0;
  let updated = 0;

  // Resolve the taxonomy once rather than per row.
  const [categories, brands] = await Promise.all([
    Category.find().select('slug').lean<{ _id: Types.ObjectId; slug: string }[]>(),
    Brand.find().select('slug').lean<{ _id: Types.ObjectId; slug: string }[]>(),
  ]);
  const categoryBySlug = new Map(categories.map((item) => [item.slug.toLowerCase(), item._id]));
  const brandBySlug = new Map(brands.map((item) => [item.slug.toLowerCase(), item._id]));

  for (const [index, raw] of rows.entries()) {
    const rowNumber = index + 1;
    const parsed = rowSchema.safeParse(raw);

    if (!parsed.success) {
      issues.push({
        row: rowNumber,
        sku: typeof raw.sku === 'string' ? raw.sku : '',
        errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      });
      continue;
    }

    const data = parsed.data;
    const errors: string[] = [];

    const categoryId = categoryBySlug.get(data.categorySlug.toLowerCase());
    if (!categoryId) errors.push(`categorySlug: "${data.categorySlug}" not found`);

    const brandId = brandBySlug.get(data.brandSlug.toLowerCase());
    if (!brandId) errors.push(`brandSlug: "${data.brandSlug}" not found`);

    const subCategoryId = data.subCategorySlug
      ? categoryBySlug.get(data.subCategorySlug.toLowerCase())
      : undefined;
    if (data.subCategorySlug && !subCategoryId) {
      errors.push(`subCategorySlug: "${data.subCategorySlug}" not found`);
    }

    // Nothing about a price is required — the catalogue lists plenty of items
    // nobody has quoted yet. What a buyer does need is a lead time on anything
    // being brought in.
    if (data.isImportItem === true && !data.leadTime) {
      errors.push('leadTime: required when isImportItem is yes');
    }

    if (errors.length > 0 || !categoryId || !brandId) {
      issues.push({ row: rowNumber, sku: data.sku, errors });
      continue;
    }

    const existing = await Product.findOne({ sku: data.sku });

    if (dryRun) {
      if (existing) updated += 1;
      else created += 1;
      continue;
    }

    const payload = {
      name: data.name,
      ...(data.description ? { description: data.description } : {}),
      ...(data.shortDescription ? { shortDescription: data.shortDescription } : {}),
      ...(data.partNumber ? { partNumber: data.partNumber } : {}),
      category: categoryId,
      subCategory: subCategoryId ?? null,
      brand: brandId,
      ...(data.availability ? { availability: data.availability } : {}),
      ...(data.leadTime ? { leadTime: data.leadTime } : {}),
      ...(data.isImportItem !== undefined ? { isImportItem: data.isImportItem } : {}),
      ...(data.lastQuotedPrice !== undefined ? { lastQuotedPrice: data.lastQuotedPrice } : {}),
      ...(data.internalCost !== undefined ? { internalCost: data.internalCost } : {}),
      ...(data.supplierNotes ? { supplierNotes: data.supplierNotes } : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: data.lowStockThreshold } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.minOrderQty !== undefined ? { minOrderQty: data.minOrderQty } : {}),
      ...(data.tags ? { tags: data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}),
      ...(data.warranty ? { warranty: data.warranty } : {}),
      ...(data.specifications ? { specifications: parseSpecs(data.specifications) } : {}),
      ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    };

    if (existing) {
      existing.set(payload);
      await existing.save();
      updated += 1;
    } else {
      await Product.create({
        ...payload,
        sku: data.sku,
        description: data.description ?? data.name,
        slug: await uniqueSlug(Product, data.name),
      });
      created += 1;
    }
  }

  return {
    totalRows: rows.length,
    created,
    updated,
    skipped: issues.length,
    dryRun,
    issues,
    recognisedColumns: IMPORT_COLUMNS,
  };
}
