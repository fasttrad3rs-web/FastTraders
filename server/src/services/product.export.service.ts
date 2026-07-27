import type { FilterQuery } from 'mongoose';
import { Product, type IProduct } from '../models';
import { buildSheet, type SheetFile, type SheetFormat } from './sheet.service';

/**
 * Product export.
 *
 * Column names match the importer exactly, so an export can be edited in Excel
 * and fed straight back through `POST /admin/products/import`.
 */

interface PopulatedProduct {
  sku: string;
  name: string;
  slug: string;
  partNumber?: string;
  shortDescription?: string;
  description: string;
  category?: { slug?: string } | null;
  subCategory?: { slug?: string } | null;
  brand?: { slug?: string } | null;
  pricingMode: string;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  stockStatus: string;
  unit: string;
  minOrderQty: number;
  tags: string[];
  warranty?: string;
  specifications: { key: string; value: string }[];
  isFeatured: boolean;
  isActive: boolean;
  ratingAvg: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
}

export interface ExportFilters {
  isActive?: boolean;
  category?: string;
  brand?: string;
}

export async function exportProducts(
  filters: ExportFilters,
  format: SheetFormat,
): Promise<SheetFile> {
  const query: FilterQuery<IProduct> = {
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.brand ? { brand: filters.brand } : {}),
  };

  // `+costPrice` is opt-in: it is `select: false` so it can never leak publicly.
  const products = await Product.find(query)
    .select('+costPrice')
    .populate({ path: 'category', select: 'slug' })
    .populate({ path: 'subCategory', select: 'slug' })
    .populate({ path: 'brand', select: 'slug' })
    .sort({ name: 1 })
    .lean<PopulatedProduct[]>();

  const rows = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    partNumber: product.partNumber ?? '',
    categorySlug: product.category?.slug ?? '',
    subCategorySlug: product.subCategory?.slug ?? '',
    brandSlug: product.brand?.slug ?? '',
    pricingMode: product.pricingMode,
    price: product.price ?? '',
    comparePrice: product.comparePrice ?? '',
    costPrice: product.costPrice ?? '',
    taxRate: product.taxRate,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    minOrderQty: product.minOrderQty,
    tags: product.tags.join(','),
    warranty: product.warranty ?? '',
    specifications: product.specifications
      .map((spec) => `${spec.key}:${spec.value}`)
      .join('|'),
    shortDescription: product.shortDescription ?? '',
    description: product.description,
    isFeatured: product.isFeatured ? 'yes' : 'no',
    isActive: product.isActive ? 'yes' : 'no',
    // Read-only columns, ignored by the importer.
    stockStatus: product.stockStatus,
    ratingAvg: product.ratingAvg,
    reviewCount: product.reviewCount,
    salesCount: product.salesCount,
    slug: product.slug,
    createdAt: product.createdAt.toISOString().slice(0, 10),
  }));

  return buildSheet(rows, { format, sheetName: 'Products', filenameBase: 'fast-traders-products' });
}
