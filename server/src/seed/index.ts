import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Banner, Brand, Category, Counter, Inquiry, InquiryList, Product, Setting, User } from '../models';
import {
  seedAdmin,
  seedBanners,
  seedBrands,
  seedCategories,
  seedInquiries,
  seedProducts,
  seedSettings,
} from './seeders';

/**
 * Database seeder.
 *
 *   npm run seed             # everything, including 50 demo products — DEV ONLY
 *   npm run seed:live        # reference data only, safe for the real database
 *   npm run seed:destroy     # remove everything the seeder creates
 *
 * Set SEED_ADMIN_PASSWORD before the first run to choose the admin password;
 * otherwise one is generated and printed exactly once.
 *
 * ## Why `--live` exists
 *
 * A production database cannot start empty. `category` and `brand` are required
 * on every product, so without the taxonomy Sharjeel cannot create his first
 * item — and hand-typing twelve brands and a category tree on launch day is how
 * slugs end up inconsistent with the ones the storefront links to.
 *
 * But it must not start with fifty invented circuit breakers either. Those are
 * demo data; a customer finding one and phoning about a product that does not
 * exist is worse than an empty catalogue.
 *
 * `--live` is the line between the two. Reference data the business genuinely
 * has — the twelve brands it stocks, the category tree, the shop's real address
 * and phone, the hero banners with real copy — and nothing invented.
 */

const shouldDestroy = process.argv.includes('--destroy');
const liveOnly = process.argv.includes('--live');

async function seed(): Promise<void> {
  logger.info(
    liveOnly
      ? '[seed] Seeding reference data only — no demo products or inquiries.'
      : '[seed] Seeding Fast Traders baseline data, including demo content...',
  );

  const brandIds = await seedBrands();
  const categoryIds = await seedCategories();

  // The fifty demo products and the eight demo inquiries are illustrative, not
  // real. They belong on a developer's machine and nowhere else.
  if (!liveOnly) {
    await seedProducts(categoryIds, brandIds);
  }

  await seedBanners();
  await seedSettings();
  // The admin has to exist before the inquiries: follow-ups are attributed
  // to a user, and an unattributed note is not a record of who called.
  await seedAdmin();

  if (!liveOnly) {
    await seedInquiries();
  }

  logger.info(
    liveOnly
      ? '[seed] Reference data ready. The catalogue is empty and waiting for real stock.'
      : '[seed] Baseline data ready.',
  );
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
    Inquiry.deleteMany({}),
    InquiryList.deleteMany({}),
    User.deleteMany({ role: 'admin', email: 'fasttrad3rs@gmail.com' }),
  ]);

  const removed = results.reduce((sum, result) => sum + result.deletedCount, 0);
  logger.warn(`[seed] Removed ${removed} documents.`);
}

/**
 * Two ways to destroy a business from a terminal, both one keystroke from a
 * command you run daily in development:
 *
 *   `npm run seed`          against production — fifty invented products appear
 *                           in the client's live catalogue
 *   `npm run seed:destroy`  against production — every product, inquiry and
 *                           follow-up the shop has ever recorded, gone
 *
 * Neither has any legitimate use against a live database, so neither is allowed
 * to run against one. `--force` exists because "never" is not quite true — a
 * fresh production database being set up for the first time is the exception —
 * but it has to be typed deliberately.
 */
function assertSafeForThisDatabase(): void {
  /*
   * The danger is the database being *pointed at*, not this machine's
   * NODE_ENV — and the first version of this guard got that wrong.
   *
   * It only checked `NODE_ENV === 'production'`, which is never true on a
   * developer's laptop. So the exact command it existed to prevent —
   * `MONGO_URI="<the live Atlas string>" npm run seed`, typed from a Mac while
   * setting up production — sailed straight past it and would have dropped
   * fifty invented products into the client's catalogue.
   *
   * A URI that is not localhost is a remote database, and a remote database is
   * somebody's. That is the test that matters.
   */
  const target = env.MONGO_URI;
  const isLocal = /(?:localhost|127\.0\.0\.1|::1)/.test(target);
  const dangerous = env.NODE_ENV === 'production' || !isLocal;

  if (!dangerous) return;

  if (process.argv.includes('--force')) {
    logger.warn('[seed] Non-local database and --force given. Proceeding.');
    return;
  }

  // Host only — never log a URI, it carries the password.
  const host = /@([^/?]+)/.exec(target)?.[1] ?? 'a remote host';
  const action = shouldDestroy ? 'seed:destroy' : 'the full seeder';

  logger.error(
    `[seed] Refusing to run ${action} against ${host}. ` +
      (shouldDestroy
        ? 'This deletes every product and every inquiry the business has. '
        : 'This inserts fifty demo products into a live catalogue. ') +
      'Use `npm run seed:live` for reference data only, or add --force if you ' +
      'are certain this database is empty and new.',
  );
  process.exit(1);
}

async function run(): Promise<void> {
  // Checked before connecting: no reason to touch the database to refuse.
  if (shouldDestroy || !liveOnly) assertSafeForThisDatabase();

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
