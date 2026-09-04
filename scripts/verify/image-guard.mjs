/**
 * Executes the real `safeImageSrc` guard.  node --experimental-strip-types
 *
 * The client workspace has no test runner, and a statically-asserted guard is
 * a guard nobody has run. Node 22 can import a TypeScript module directly once
 * the types are stripped, so these assertions exercise the shipped code rather
 * than a copy of it.
 *
 * Exits non-zero on the first mismatch; `catalog-pivot.cjs` runs it as one
 * check and surfaces the message.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(here, '../../client/src/lib/images.ts');

const { IMAGE_FALLBACK, isRenderableImage, safeImageSrc } = await import(modulePath);

const CASES = [
  ['a Cloudinary URL', 'https://res.cloudinary.com/by9gftmc/image/upload/v1/hero.jpg', true],
  ['a root-relative path', '/placeholders/banners/trade-strip.svg', true],
  ['a root-relative path with a query', '/placeholders/default.svg?v=2', true],
  // A local preview of a just-picked file. Same origin, never fetched.
  ['a blob: object URL', 'blob:http://localhost:3000/9f2c-4a1b', true],
  // The one that replaced the entire home page with the error boundary.
  ['the placeholder service', 'https://placehold.co/1920x720/png', false],
  ['another unconfigured host', 'https://images.unsplash.com/photo-1.jpg', false],
  ['a protocol-relative URL', '//res.cloudinary.com/x.jpg', false],
  ['a javascript: URL', 'javascript:alert(1)', false],
  ['a data: URL', 'data:image/svg+xml;base64,AAAA', false],
  ['a bare filename', 'hero.jpg', false],
  ['an empty string', '', false],
  ['undefined', undefined, false],
  ['null', null, false],
];

const failures = [];

for (const [label, src, expected] of CASES) {
  const actual = isRenderableImage(src);
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

const cloudinary = 'https://res.cloudinary.com/by9gftmc/image/upload/v1/a.jpg';
if (safeImageSrc(cloudinary) !== cloudinary) failures.push('a renderable source was not passed through');
if (safeImageSrc('https://placehold.co/x') !== IMAGE_FALLBACK) failures.push('a bad host did not fall back');
if (safeImageSrc(null, '/placeholders/circuit-breakers.svg') !== '/placeholders/circuit-breakers.svg') {
  failures.push('a caller-supplied fallback was ignored');
}

if (failures.length > 0) {
  console.error(failures.join('; '));
  process.exit(1);
}

console.log(`${CASES.length + 3} assertions passed`);
