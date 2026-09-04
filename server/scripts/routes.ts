/* eslint-disable no-console */
/**
 * Print every route registered on the Express app.
 *
 *   npx tsx scripts/routes.ts
 *
 * Walks the real router stack rather than reading the route files, so this
 * cannot drift from what the server actually serves — a route file that is
 * never mounted will not appear, and a route mounted twice will appear twice.
 *
 * No database is touched: `createApp()` builds the middleware and router tree
 * and nothing else.
 */

process.env.PORT ??= '5050';
process.env.JWT_ACCESS_SECRET ??= 'routes_access_secret_at_least_32_characters_x';
process.env.ACCESS_EXPIRY ??= '15m';
process.env.CLIENT_URL ??= 'https://www.fasttraders.co';
process.env.CLOUDINARY_API_KEY ??= 'routes';
process.env.CLOUDINARY_FOLDER ??= 'routes';
process.env.SMTP_PORT ??= '587';
process.env.SMTP_USER ??= 'routes@example.com';
process.env.SMTP_FROM ??= 'Fast Traders <routes@example.com>';
process.env.LOG_LEVEL ??= 'error';

/*
 * Dynamic import: a static one is hoisted above the assignments above, so the
 * app's environment check would run before any of them had been set.
 */
// Must be first: it seeds process.env before the app's Zod check runs.
import './env-setup';

import { createApp } from '../src/app';

interface Layer {
  name?: string;
  regexp?: RegExp;
  handle?: { stack?: Layer[] };
  route?: { path?: string; methods?: Record<string, boolean>; stack?: { name?: string }[] };
}

/** Turn Express's mount regex back into the path fragment it came from. */
function fragmentOf(layer: Layer): string {
  const source = layer.regexp?.source;
  if (!source || source === '^\\/?(?=\\/|$)') return '';

  return source
    .replace('^\\/', '/')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param')
    .replace(/\$$/, '');
}

const routes: { method: string; path: string; guards: string[] }[] = [];

function walk(stack: Layer[], prefix: string, inherited: string[]): void {
  // Guards registered with `router.use(...)` apply to everything after them
  // in the same stack, which is how the admin tree gets `protect`.
  const guards = [...inherited];

  for (const layer of stack) {
    if (layer.route) {
      const path = `${prefix}${layer.route.path ?? ''}` || '/';
      const local = (layer.route.stack ?? [])
        .map((entry) => entry.name)
        .filter(
          (name): name is string =>
            typeof name === 'string' &&
            ['protect', 'restrictTo', 'optionalAuth', 'honeypot', 'validate'].some((g) =>
              name.includes(g),
            ),
        );

      for (const [method, enabled] of Object.entries(layer.route.methods ?? {})) {
        if (enabled) {
          routes.push({
            method: method.toUpperCase(),
            path,
            guards: [...new Set([...guards, ...local])],
          });
        }
      }
      continue;
    }

    if (layer.handle?.stack) {
      walk(layer.handle.stack, `${prefix}${fragmentOf(layer)}`, guards);
      continue;
    }

    // `router.use(guard)` layers. express-rate-limit names its handler
    // `rateLimit`, which is indistinguishable between limiters — good enough
    // to show that one is present.
    const name = layer.name ?? '';
    if (['protect', 'restrictTo', 'rateLimit'].includes(name)) {
      guards.push(name === 'rateLimit' ? 'rateLimit' : name);
    }
  }
}

const app = createApp();
walk((app as unknown as { _router: { stack: Layer[] } })._router.stack, '', []);

const width = Math.max(...routes.map((route) => route.path.length));
let group = '';

console.log(`\n${routes.length} routes registered\n`);

for (const route of routes.sort((a, b) => a.path.localeCompare(b.path))) {
  const segment = route.path.split('/').slice(0, 4).join('/');
  if (segment !== group) {
    group = segment;
    console.log('');
  }
  const guards = route.guards.length > 0 ? `   [${route.guards.join(' + ')}]` : '';
  console.log(`  ${route.method.padEnd(6)} ${route.path.padEnd(width)}${guards}`);
}

console.log('');
