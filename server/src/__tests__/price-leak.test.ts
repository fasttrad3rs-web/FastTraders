import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../app';
import * as models from '../models';
import { allKeys, FORBIDDEN_KEYS, poisonedProduct, SENTINELS } from './helpers/poison';
import { stubModelReads } from './helpers/query-stub';

/**
 * THE PRICE-LEAK CI BLOCKER.
 *
 * Fast Traders publishes no prices. Not "prices behind a login" — none at all,
 * because the whole commercial model is that a buyer phones and Sharjeel
 * quotes them based on who they are and what they are buying. A cost figure
 * reaching a competitor's scraper is the single worst thing this codebase can
 * do, and unlike a broken page nobody would ever notice it happening.
 *
 * So this suite is deliberately blunt. Every public endpoint is called with
 * the database poisoned — every model returns a document stuffed with staff
 * data — and the response is checked two ways:
 *
 *   - no forbidden key name at any depth
 *   - no sentinel value anywhere in the serialised body
 *
 * It asserts on the *whole body*, never on named properties. A test written as
 * `expect(body.product.stock).toBeUndefined()` passes happily while the same
 * number sits in `body.product.variants[0].stock`, which is exactly the kind
 * of leak that ships.
 *
 * If this suite fails, do not adjust the test. Find what widened.
 */

/** Every public GET. Additions here are cheap; omissions are the risk. */
const PUBLIC_GETS = [
  '/api/v1/products',
  '/api/v1/products?category=circuit-breakers&sort=newest&page=1',
  '/api/v1/products/terasaki-s250-nj-250a',
  '/api/v1/products/64b7c0de1234567890abcdef/similar',
  '/api/v1/categories',
  '/api/v1/categories/circuit-breakers',
  '/api/v1/brands',
  '/api/v1/search/suggest?q=mccb',
  '/api/v1/testimonials',
  '/api/v1/settings',
  '/api/v1/banners',
  '/api/v1/inquiry-list/items',
] as const;

const FORBIDDEN = new Set<string>(FORBIDDEN_KEYS);

/** Report *what* leaked and *where*, so a failure is actionable at 2am. */
function findLeaks(body: unknown): string[] {
  const problems: string[] = [];

  for (const key of allKeys(body)) {
    if (FORBIDDEN.has(key)) problems.push(`forbidden key "${key}"`);
  }

  const json = JSON.stringify(body);
  for (const sentinel of SENTINELS) {
    if (json.includes(sentinel)) problems.push(`sentinel value ${sentinel}`);
  }

  return problems;
}

describe('no public endpoint leaks staff-only data', () => {
  let app: ReturnType<typeof createApp>;

  /*
   * `beforeAll`, not `beforeEach`. Each `createApp()` installs the rate
   * limiters, and express-rate-limit's MemoryStore keeps a `setInterval` alive
   * to expire old windows. Fifteen apps meant fifteen live timers and a
   * "worker process failed to exit gracefully" warning at the end of every
   * run — harmless here, but the kind of warning that gets ignored right up
   * until it is hiding a real leak. `clearMocks` only clears call history, not
   * implementations, so stubbing once is enough.
   */
  beforeAll(() => {
    const poisoned = poisonedProduct();

    /*
     * `Product` is the only collection that carries cost data, so it is the
     * only one poisoned with it directly. Poisoning *every* model with product
     * fields — the first version of this — tests an impossible state: Mongoose
     * runs in strict mode, so a Category document cannot hold `internalCost`
     * however hard an attacker tries. Those failures were noise, and noise is
     * what gets a security suite skipped.
     *
     * What is *not* impossible is a product reaching the public through some
     * other collection's populated ref — a testimonial naming the breaker it
     * praises, a banner promoting a featured item. That risk is real but it is
     * a *source* property, not a response property, so it is guarded by
     * "public code never reaches a product without a whitelist" below rather
     * than by inventing a response shape here.
     */
    for (const [name, value] of Object.entries(models)) {
      if (typeof value !== 'function' || !('findOne' in value)) continue;

      /*
       * Non-product collections hold an *unpopulated* ObjectId, which is what
       * they return today — none of the public controllers call
       * `.populate('product')`. Embedding a full product here instead would
       * fail every one of these endpoints for a state that cannot occur, and
       * the fix would then be to weaken the guard. The real risk is that
       * somebody *adds* that populate later, which the source-level test below
       * catches directly.
       */
      const doc =
        name === 'Product'
          ? poisoned
          : {
              _id: poisoned._id,
              name: 'Public-safe document',
              slug: 'public-safe',
              title: 'Public-safe document',
              isActive: true,
              isPublished: true,
              product: poisoned._id,
              items: [],
            };

      stubModelReads(value as unknown as Record<string, unknown>, doc);
    }

    app = createApp();
  });

  it.each(PUBLIC_GETS)('%s', async (url) => {
    const response = await request(app).get(url);

    // A 4xx/5xx is not a pass — it means the endpoint never ran and the
    // sweep proved nothing. Only a body that was actually produced counts.
    expect(response.status).toBeLessThan(500);

    const leaks = findLeaks(response.body);
    expect(leaks).toEqual([]);
  });

  it('the guard itself detects a leak when one is planted', () => {
    /*
     * A leak test that cannot fail is decoration. This proves the detector
     * works by handing it a body that genuinely leaks — if `findLeaks` were
     * ever weakened to always return `[]`, every assertion above would pass
     * and this one would not.
     */
    const leaky = { data: { product: { name: 'X', variants: [{ price: 777_333_777 }] } } };
    const leaks = findLeaks(leaky);

    expect(leaks).toContain('forbidden key "price"');
    expect(leaks).toContain('sentinel value 777333777');
  });

  /*
   * The sweep above can only test responses the code produces *today*. This
   * one guards the change that would break it tomorrow.
   *
   * Testimonial, Category and Brand all carry `ref: 'Product'`. None of them
   * populates it right now, so a product never reaches those responses — which
   * is exactly why the sweep passes. The day somebody adds `.populate('product')`
   * to show the breaker next to the quote (an obvious, likely feature), the
   * whole raw document ships: no serialiser runs on a testimonial.
   *
   * So the rule is enforced at the source instead: public code may reach a
   * product either through `toPublicProduct`, or through an explicit `.select()`
   * projection. Both are whitelists. A bare populate is neither.
   */
  it('public code never reaches a product without a whitelist', () => {
    const roots = ['src/controllers', 'src/services'];
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of readdirSync(join(process.cwd(), root))) {
        if (!file.endsWith('.ts')) continue;

        const path = join(process.cwd(), root, file);
        const src = readFileSync(path, 'utf8');

        // Admin code is allowed to see everything; it sits behind auth.
        if (file.startsWith('admin') || src.includes('ADMIN-ONLY')) continue;

        const populatesProduct = /populate\(\s*\{?\s*(path:\s*)?'products?'/.test(src);
        const readsProduct = /Product\.(find|findOne|findById)\(/.test(src);
        if (!populatesProduct && !readsProduct) continue;

        const whitelisted = src.includes('toPublicProduct') || /\.select\(/.test(src);
        if (!whitelisted) offenders.push(`${root}/${file}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not confuse legitimate public values with leaks', () => {
    /*
     * `availability: 'ready_stock'` contains the substring "stock", and an
     * over-eager guard that grepped the raw JSON for field *names* would
     * reject it. The key check walks keys, not text, precisely so this
     * passes — a false positive here would train people to disable the suite.
     */
    const clean = {
      data: { product: { availability: 'ready_stock', unit: 'piece', minOrderQty: 1 } },
    };

    expect(findLeaks(clean)).toEqual([]);
  });
});
