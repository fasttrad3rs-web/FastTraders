import type { PipelineStage, Types } from 'mongoose';
import { Brand, Category, Product } from '../models';
import { buildProductFilter, type ResolvedRefs } from './catalog.filter';
import type { ProductQuery } from '../validators';

/**
 * Facet counts for the filter sidebar.
 *
 * Each facet is computed with its *own* dimension removed from the filter —
 * otherwise selecting "Schneider" would collapse the brand list to a single
 * entry and the shopper could never widen the selection again.
 */

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  /** Ready / on order / imported / discontinued — replaced the price slider. */
  availability: FacetBucket[];
  specs: { key: string; values: FacetBucket[] }[];
}

const MAX_SPEC_KEYS = 8;
const MAX_SPEC_VALUES = 12;

interface IdCount {
  _id: Types.ObjectId | string | null;
  count: number;
}

interface SpecRow {
  _id: { key: string; value: string };
  count: number;
}

export async function buildFacets(
  query: ProductQuery,
  refs: ResolvedRefs,
): Promise<ProductFacets> {
  // Shared prefix: everything except the four facetable dimensions.
  const base = buildProductFilter(query, refs, ['category', 'brand', 'availability']);

  const withoutBrand = buildProductFilter(query, refs, ['brand']);
  const withoutCategory = buildProductFilter(query, refs, ['category']);
  const withoutAvailability = buildProductFilter(query, refs, ['availability']);

  const pipeline: PipelineStage[] = [
    { $match: base },
    {
      $facet: {
        brands: [{ $match: withoutBrand }, { $group: { _id: '$brand', count: { $sum: 1 } } }],
        categories: [
          { $match: withoutCategory },
          { $group: { _id: '$subCategory', count: { $sum: 1 } } },
        ],
        availability: [
          { $match: withoutAvailability },
          { $group: { _id: '$availability', count: { $sum: 1 } } },
        ],
        specs: [
          { $match: withoutBrand },
          { $unwind: '$specifications' },
          {
            $group: {
              _id: { key: '$specifications.key', value: '$specifications.value' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: MAX_SPEC_KEYS * MAX_SPEC_VALUES },
        ],
      },
    },
  ];

  const [raw] = await Product.aggregate<{
    brands: IdCount[];
    categories: IdCount[];
    availability: IdCount[];
    specs: SpecRow[];
  }>(pipeline);

  if (!raw) {
    return { categories: [], brands: [], availability: [], specs: [] };
  }

  const [brandLabels, categoryLabels] = await Promise.all([
    labelMap('brand', raw.brands),
    labelMap('category', raw.categories),
  ]);

  return {
    brands: toBuckets(raw.brands, brandLabels),
    categories: toBuckets(raw.categories, categoryLabels),
    availability: raw.availability
      .filter((row): row is IdCount & { _id: string } => typeof row._id === 'string')
      .map((row) => ({
        value: row._id,
        label: AVAILABILITY_LABELS[row._id] ?? row._id,
        count: row.count,
      })),
    specs: groupSpecs(raw.specs),
  };
}

/** Buyer-facing wording. "available_on_order" means nothing to a customer. */
const AVAILABILITY_LABELS: Record<string, string> = {
  ready_stock: 'Ready stock',
  available_on_order: 'Available on order',
  import_on_request: 'Imported on request',
  discontinued: 'Discontinued',
};

interface LabelRow {
  _id: Types.ObjectId;
  slug: string;
  name: string;
}

/** Resolve ObjectId buckets to `{ slug, name }` for display. */
async function labelMap(
  kind: 'brand' | 'category',
  rows: IdCount[],
): Promise<Map<string, { slug: string; name: string }>> {
  const ids = rows
    .map((row) => row._id)
    .filter((id): id is Types.ObjectId => id !== null && typeof id !== 'string');

  if (ids.length === 0) return new Map();

  const filter = { _id: { $in: ids } };
  const docs =
    kind === 'brand'
      ? await Brand.find(filter).select('slug name').lean<LabelRow[]>()
      : await Category.find(filter).select('slug name').lean<LabelRow[]>();

  return new Map(docs.map((doc) => [doc._id.toString(), { slug: doc.slug, name: doc.name }]));
}

function toBuckets(rows: IdCount[], labels: Map<string, { slug: string; name: string }>): FacetBucket[] {
  return rows
    .map((row) => {
      if (row._id === null || typeof row._id === 'string') return null;
      const label = labels.get(row._id.toString());
      if (!label) return null;
      return { value: label.slug, label: label.name, count: row.count };
    })
    .filter((bucket): bucket is FacetBucket => bucket !== null)
    .sort((a, b) => b.count - a.count);
}

function groupSpecs(rows: SpecRow[]): { key: string; values: FacetBucket[] }[] {
  const grouped = new Map<string, FacetBucket[]>();

  for (const row of rows) {
    const bucket = grouped.get(row._id.key) ?? [];
    if (bucket.length < MAX_SPEC_VALUES) {
      bucket.push({ value: row._id.value, label: row._id.value, count: row.count });
    }
    grouped.set(row._id.key, bucket);
  }

  return [...grouped.entries()]
    .map(([key, values]) => ({ key, values }))
    .sort((a, b) => b.values.length - a.values.length)
    .slice(0, MAX_SPEC_KEYS);
}
