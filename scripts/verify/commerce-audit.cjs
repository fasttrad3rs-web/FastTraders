/*
 * Commerce-vocabulary audit.   npm run audit:commerce
 *
 * Greps client/ for what a priced storefront leaves behind. A raw grep is
 * useless here, because the word "price" appears on this site more than it
 * would on a shop that actually publishes prices — "Call for best price",
 * "How do I get a price?", "we will come back with a price" are the entire
 * conversion strategy. What matters is the opposite: whether a *figure*, a
 * cart or a checkout ever reaches a public page.
 *
 * So hits are sorted:
 *
 *   LEAK   — currency rendering, cart/checkout nouns, price sort or filter, on
 *            a public surface. Must be zero; a hit fails the run.
 *   COPY   — prose that mentions price conversationally. Listed for review.
 *   ADMIN  — staff-only screens, where internal cost is meant to be visible.
 *   BENIGN — comments, and identifiers that only look commercial.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** Renders money, or belongs to a basket. Never acceptable in public. */
const LEAK_PATTERNS = [
  // The call, not the definition: `lib/utils.ts` may declare a formatter the
  // admin needs. What must never happen is a public component invoking it.
  [/formatPKR\s*\(|import\s*\{[^}]*formatPKR/, 'currency formatter'],
  [/Rs\.\s*\{|Rs\.\s*\d/, 'rendered rupee amount'],
  [/\bPKR\b/, 'currency code'],
  // …except where the code is merely declared or typed. See DECLARATION_FILES.
  [/\bcarts?\b/i, 'cart'],
  [/addToCart|useCart|cartStore/i, 'cart API'],
  [/\bcheckout\b/i, 'checkout'],
  [/price_(asc|desc)|priceRange(?!\s*is)|minPrice|maxPrice|PriceRangeSlider/, 'price sort or filter'],
  [/comparePrice|strikethrough|wasPrice/i, 'was/now pricing'],
  [/\bsubtotal\b|\bgrand total\b|\btax rate\b/i, 'order totals'],
];

/** Mentions price as a thing to ask us for. That is the design, not a bug. */
const COPY_PATTERN = /\bprices?\b|\bpricing\b|\bquoted?\b/i;

/*
 * Shared modules that *define* currency handling without rendering it. The
 * admin imports from here; the storefront must not, which is what the
 * `formatPKR(` call pattern above enforces.
 */
const DECLARATION_FILES = [
  'client/src/lib/utils.ts',
  'client/src/lib/constants.ts',
  /^client\/src\/types\//,
];

const BENIGN_IDENTIFIERS = [
  /Price on Request|PriceOnRequest|price-on-request/i,
  /lastQuotedPrice|internalCost|quotedAmount|internalQuotedAmount/,
  /totalPages|totalActive|totalItems|meta\.total|\btotal\b\s*[:<]/,
  /currenciesAccepted/, //  LocalBusiness schema — a fact about the shop
  /price in Pakistan/i, //  SEO keyword: what buyers actually search
];

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
};

/** Line numbers inside a comment, so an explanation is not read as code. */
function commentLines(source) {
  const inside = new Set();
  let block = false;
  source.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (block) {
      inside.add(index + 1);
      if (trimmed.includes('*/')) block = false;
      return;
    }
    // A whole-line comment, including `/** … */` closed on the same line.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || /^\/\*.*\*\/$/.test(trimmed)) {
      inside.add(index + 1);
    }
    if (trimmed.includes('/*') && !trimmed.includes('*/')) {
      block = true;
      inside.add(index + 1);
    }
  });
  return inside;
}

const buckets = { LEAK: [], COPY: [], ADMIN: [], BENIGN: [] };

for (const file of walk('client/src')) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const comments = commentLines(source);
  const isAdmin = /(^|\/)admin(\/|\.|$)/.test(file);

  source.split('\n').forEach((line, index) => {
    const at = `${file}:${index + 1}`;
    const text = line.trim().slice(0, 100);

    const leak = LEAK_PATTERNS.find(([re]) => re.test(line));
    const isCopy = COPY_PATTERN.test(line);
    if (!leak && !isCopy) return;

    const label = leak ? leak[1] : 'copy';
    const entry = `${at}  [${label}]  ${text}`;

    const isDeclaration = DECLARATION_FILES.some((f) =>
      typeof f === 'string' ? file === f : f.test(file),
    );

    if (comments.has(index + 1)) buckets.BENIGN.push(entry);
    else if (isDeclaration) buckets.BENIGN.push(entry);
    else if (BENIGN_IDENTIFIERS.some((re) => re.test(line))) buckets.BENIGN.push(entry);
    else if (isAdmin) buckets.ADMIN.push(entry);
    else if (leak) buckets.LEAK.push(entry);
    else buckets.COPY.push(entry);
  });
}

for (const name of ['LEAK', 'COPY', 'ADMIN', 'BENIGN']) {
  const rows = buckets[name];
  console.log(`\n===== ${name} (${rows.length}) =====`);
  if (name === 'LEAK') console.log(rows.length === 0 ? '  none' : rows.map((r) => `  ${r}`).join('\n'));
  else if (name === 'COPY') console.log(rows.map((r) => `  ${r}`).join('\n') || '  none');
  else console.log('  (not listed — expected)');
}

console.log(
  buckets.LEAK.length === 0
    ? '\nNo price, cart or checkout reaches a public surface.\n'
    : `\n${buckets.LEAK.length} leak(s) on public surfaces.\n`,
);
process.exit(buckets.LEAK.length === 0 ? 0 : 1);
