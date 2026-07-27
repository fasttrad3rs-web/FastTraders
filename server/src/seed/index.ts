import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../config/logger';
import { Banner, Brand, Category, Counter, Product, Setting, User } from '../models';
import {
  seedAdmin,
  seedBanners,
  seedBrands,
  seedCategories,
  seedProducts,
  seedSettings,
} from './seeders';

/**
 * Database seeder.
 *
 *   npm run seed             # insert / refresh baseline data (idempotent)
 *   npm run seed:destroy     # remove everything the seeder creates
 *
 * Set SEED_ADMIN_PASSWORD before the first run to choose the admin password;
 * otherwise one is generated and printed exactly once.
 */

const shouldDestroy = process.argv.includes('--destroy');

async function seed(): Promise<void> {
  logger.info('[seed] Seeding Fast Traders baseline data...');

  const brandIds = await seedBrands();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds, brandIds);
  await seedBanners();
  await seedSettings();
  await seedAdmin();

  logger.info('[seed] Baseline data ready.');
}

async function destroy(): Promise<void> {
  logger.warn('[seed] Removing seeded data...');

  const results = await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Banner.deleteMany({}),
    Setting.deleteMany({}),
    Counter.deleteMany({}),
    User.deleteMany({ role: 'admin', email: 'fasttrad3rs@gmail.com' }),
  ]);

  const removed = results.reduce((sum, result) => sum + result.deletedCount, 0);
  logger.warn(`[seed] Removed ${removed} documents.`);
}

async function run(): Promise<void> {
  await connectDatabase();
  try {
    await (shouldDestroy ? destroy() : seed());
    logger.info('[seed] Done.');
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);
  logger.error(`[seed] Failed: ${message}`);
  process.exit(1);
});
