import type { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Inquiry, Product, User } from '../models';
import { inquiries } from './data';

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000);

/**
 * Sample pipeline.
 *
 * Cleared and rewritten on every run rather than upserted: these are demo
 * records with relative dates, and an idempotent merge would leave last
 * week's copies sitting next to this week's with the same customers.
 */
export async function seedInquiries(): Promise<number> {
  await Inquiry.deleteMany({});

  const admin = await User.findOne({ role: 'admin' }).select('_id');
  const skus = inquiries.flatMap((inquiry) => inquiry.itemSkus ?? []);
  const productDocs = await Product.find({ sku: { $in: skus } })
    .select('name sku unit brand')
    .populate({ path: 'brand', select: 'name' })
    .lean<{ _id: Types.ObjectId; name: string; sku: string; unit: string; brand?: { name?: string } }[]>();

  const bySku = new Map(productDocs.map((product) => [product.sku, product]));
  let count = 0;

  for (const seed of inquiries) {
    const items = (seed.itemSkus ?? []).flatMap((sku) => {
      const product = bySku.get(sku);
      if (!product) {
        logger.warn(`[seed] Inquiry references unknown SKU ${sku} — line skipped`);
        return [];
      }
      return [
        {
          product: product._id,
          name: product.name,
          sku: product.sku,
          ...(product.brand?.name ? { brand: product.brand.name } : {}),
          qty: 4,
          unit: product.unit,
        },
      ];
    });

    const doc = new Inquiry({
      type: seed.type,
      customer: seed.customer,
      items,
      ...(seed.sourcing
        ? {
            sourcingDetails: {
              ...seed.sourcing,
              ...(seed.sourcing.daysUntilTarget
                ? { targetDate: daysAgo(-seed.sourcing.daysUntilTarget) }
                : {}),
              referenceFiles: [],
            },
          }
        : {}),
      ...(seed.message ? { message: seed.message } : {}),
      preferredContactMethod: seed.preferredContactMethod ?? 'phone',
      ...(seed.preferredContactTime ? { preferredContactTime: seed.preferredContactTime } : {}),
      status: seed.status,
      priority: seed.priority,
      source: seed.source,
      ...(seed.internalQuotedAmount ? { internalQuotedAmount: seed.internalQuotedAmount } : {}),
      ...(seed.lostReason ? { lostReason: seed.lostReason } : {}),
      ...(admin ? { assignedTo: admin._id } : {}),
      followUps: (seed.followUps ?? []).map((followUp) => ({
        note: followUp.note,
        by: admin?._id,
        at: daysAgo(followUp.daysAgo),
        ...(followUp.nextFollowUpInDays
          ? { nextFollowUpAt: daysAgo(-followUp.nextFollowUpInDays) }
          : {}),
      })),
    });

    await doc.save();
    // `timestamps: true` overwrites createdAt on save, so the backdating has
    // to happen afterwards, without validators.
    await Inquiry.updateOne({ _id: doc._id }, { $set: { createdAt: daysAgo(seed.daysAgo) } });
    count += 1;
  }

  logger.info(`[seed] Inquiries: ${count}`);
  return count;
}
