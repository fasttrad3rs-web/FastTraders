import type { Model } from 'mongoose';

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a slug that is unique within a collection.
 * Collisions get a numeric suffix: `mccb-250a`, `mccb-250a-2`, `mccb-250a-3`.
 *
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
export async function uniqueSlug<T>(
  model: Model<T>,
  source: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(source) || 'item';

  // One query fetches every sibling slug, so N collisions cost one round trip.
  const taken = await model
    .find({
      slug: new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?$`),
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
    .select('slug')
    .lean<{ slug: string }[]>();

  const used = new Set(taken.map((item) => item.slug));
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
