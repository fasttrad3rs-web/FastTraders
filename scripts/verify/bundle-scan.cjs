#!/usr/bin/env node
'use strict';

/**
 * Scans the BUILT client bundle for admin-only field names.
 *
 * The price-leak suite proves the API never sends cost data. This proves the
 * other half: that the shipped JavaScript never so much as mentions it.
 *
 * Why that is a separate problem. The public pages and the admin panel are one
 * Next.js app, so they share a build. A careless import — a shared `formatters`
 * module that happens to export `formatInternalCost`, an admin type re-exported
 * from a barrel that a product page also pulls from — drags admin identifiers
 * into a chunk that any visitor downloads. Nothing breaks. No response leaks.
 * But `internalCost` sits in a JS file on the CDN, and it tells a competitor
 * exactly what this business tracks and what to go looking for.
 *
 * Admin *route* chunks are excluded: those only load behind the auth guard,
 * and an admin screen legitimately renders the internal cost.
 *
 * Usage:  node scripts/verify/bundle-scan.cjs
 *         (run `npm run build:client` first)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const BUILD = path.join(ROOT, 'client', '.next');

/** Identifiers that must never appear in a chunk a public visitor loads. */
const FORBIDDEN = [
  'internalCost',
  'lastQuotedPrice',
  'supplierNotes',
  'costPrice',
  'lowStockThreshold',
];

/**
 * Chunks that only ever load behind the admin auth guard.
 *
 * Next.js names route chunks after the route, so `app/admin/...` is reliable.
 * If that naming ever changes this check gets *stricter*, not weaker — an
 * unrecognised admin chunk would be scanned and would fail loudly, which is
 * the correct direction for a security check to break in.
 */
function isAdminChunk(file) {
  const normalised = file.split(path.sep).join('/');
  return normalised.includes('/admin/') || /(^|\/)admin[-.]/.test(normalised);
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(BUILD)) {
    console.error('No client build found at client/.next');
    console.error('Run `npm run build:client` first.');
    process.exit(2);
  }

  // `static/chunks` is what the browser downloads; `server` never ships.
  const files = walk(path.join(BUILD, 'static'));

  if (files.length === 0) {
    console.error('Build directory exists but contains no chunks — build may have failed.');
    process.exit(2);
  }

  const hits = [];
  let scanned = 0;

  for (const file of files) {
    if (isAdminChunk(file)) continue;
    scanned += 1;

    const source = fs.readFileSync(file, 'utf8');
    for (const term of FORBIDDEN) {
      if (source.includes(term)) {
        hits.push({ file: path.relative(ROOT, file), term });
      }
    }
  }

  console.log(`Scanned ${scanned} public chunk(s) for ${FORBIDDEN.length} admin-only names.`);

  if (hits.length > 0) {
    console.error('\nAdmin-only identifiers found in publicly served JavaScript:\n');
    for (const hit of hits) console.error(`  ${hit.term}  →  ${hit.file}`);
    console.error(
      '\nUsually a shared import pulling an admin type or helper into a public chunk.',
    );
    process.exit(1);
  }

  console.log('No admin-only field names reach a public chunk.');
}

main();
