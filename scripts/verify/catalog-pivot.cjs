/*
 * Catalogue-only pivot verification.  `npm run verify`
 *
 * Static assertions over the source: no price reaches any public surface, no
 * commerce code survives, the mirrored types agree, staff auth is reachable.
 * Zero dependencies and no build step, so it runs anywhere the repo does —
 * `tsc` cannot catch any of this, because none of it is a type error.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push([r === true, name, r === true ? '' : String(r)]); }
  catch (e) { results.push([false, name, e.message]); }
};
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
/*
 * Comment-stripped source. Several checks look for a forbidden identifier,
 * and the code that removed it usually leaves a comment explaining why — so
 * matching raw text reports a leak that is really just documentation.
 */
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
};

/* ---------------------------- 1. Price privacy --------------------------- */

check('Product model hides every internal figure at the schema', () => {
  const s = read('server/src/models/Product.ts');
  const hidden = ['lastQuotedPrice', 'internalCost', 'supplierNotes'];
  const missing = hidden.filter((f) => !new RegExp(`${f}: \\{[^}]*select: false`).test(s));
  return missing.length === 0 || `not select:false — ${missing.join(', ')}`;
});

check('The public whitelist is a whitelist, not a projection', () => {
  const s = code('server/src/models/Product.public.ts');
  // A `-field` projection ships every future field publicly by default.
  if (/select\(['"`]-/.test(s)) return 'a blacklist projection crept in';
  return /export function toPublicProduct/.test(s) || 'toPublicProduct is gone';
});

check('No internal field is named in the public shape', () => {
  const s = code('server/src/models/Product.public.ts');
  const m = s.match(/export interface PublicProduct \{([\s\S]*?)\n\}/);
  if (!m) return 'PublicProduct not found';
  const banned = ['lastQuotedPrice', 'internalCost', 'supplierNotes', 'stock', 'salesCount'];
  const hit = banned.filter((f) => new RegExp(`\\b${f}\\??:`).test(m[1]));
  return hit.length === 0 || `whitelisted by mistake: ${hit.join(', ')}`;
});

check('Public Product type carries no price field', () => {
  const s = code('client/src/types/catalog.types.ts');
  return !/^\s+(price|comparePrice|costPrice|pricingMode)[?]?:/m.test(s) || 'a price field is present';
});

check('No public projection selects price', () => {
  const bad = [];
  for (const f of walk('server/src/services').concat(walk('server/src/controllers'))) {
    if (/admin/.test(f) || /report\.service|product\.export/.test(f)) continue;
    const s = code(f);
    for (const m of s.matchAll(/\+price|\+costPrice/g)) bad.push(`${f}: ${m[0]}`);
  }
  return bad.length === 0 || bad.join(', ');
});

check('Admin report/export are the only opt-ins to price', () => {
  const opted = walk('server/src').filter((f) => /\+price|\+costPrice/.test(read(f)));
  const allowed = opted.every((f) => /admin|report\.service|product\.export/.test(f));
  return allowed || `unexpected: ${opted.join(', ')}`;
});

check('No storefront component formats a product price', () => {
  const bad = [];
  for (const f of walk('client/src/app/(storefront)').concat(
    walk('client/src/components/product'),
    walk('client/src/components/catalog'),
    walk('client/src/components/home'),
  )) {
    if (f.includes('style-guide')) continue;
    const s = code(f);
    if (/formatPKR/.test(s)) bad.push(f);
    if (/product\.price|\.comparePrice|pricingMode/.test(s)) bad.push(`${f} (field)`);
  }
  return bad.length === 0 || bad.join(', ');
});

check('The list projection names no price path', () => {
  const s = read('server/src/services/catalog.filter.ts');
  const m = s.match(/export const LIST_PROJECTION =([\s\S]*?);/);
  if (!m) return 'LIST_PROJECTION not found';
  // Naming a select:false path in a projection re-enables it, so the string
  // itself has to be clean — the model-level guard is not enough.
  return !/\bprice\b|\bcostPrice\b|comparePrice/.test(m[1]) || `leaks: ${m[1].trim()}`;
});

check('Search autocomplete projects no price', () => {
  const s = read('server/src/services/catalog.service.ts');
  const m = s.match(/\.select\('name slug sku[^']*'\)/);
  return (m && !/price/i.test(m[0])) || `projection: ${m ? m[0] : 'not found'}`;
});

check('Variant price is hidden at the embedded path', () => {
  const s = read('server/src/models/Product.subschemas.ts');
  return /price: \{ type: Number, min: 0, select: false \}/.test(s)
    || 'variants[].price is readable — the parent select:false does not reach it';
});

check('Public variant type carries no price', () => {
  const s = code('client/src/types/catalog.types.ts');
  const m = s.match(/export interface ProductVariant \{[\s\S]*?\n\}/);
  return (m && !/price/.test(m[0])) || 'ProductVariant still exposes a price';
});

check('No price range filter on the public query', () => {
  // minPrice/maxPrice over a hidden field is an oracle: a handful of requests
  // binary-searches any product's exact price.
  const v = code('server/src/validators/catalog.validators.ts');
  const f = code('server/src/services/catalog.filter.ts');
  return (!/minPrice|maxPrice/.test(v) && !/minPrice|maxPrice/.test(f))
    || 'a price range filter survives';
});

check('No price sort option', () => {
  const v = code('server/src/validators/catalog.validators.ts');
  const f = code('server/src/services/catalog.filter.ts');
  return (!/price_asc|price_desc/.test(v + f)) || 'sorting by price would leak the ordering';
});

check('Facets expose availability, not price range or pricing mode', () => {
  const s = code('server/src/services/catalog.facets.ts');
  return (!/priceRange|pricingMode/.test(s) && /availability/.test(s))
    || 'a price facet survives';
});

check('Sort options carry no price ordering', () => {
  const s = code('server/src/validators/catalog.validators.ts');
  const m = s.match(/PRODUCT_SORTS = \[([^\]]*)\]/);
  if (!m) return 'PRODUCT_SORTS not found';
  return !/price/.test(m[1]) || `leaks ordering: ${m[1]}`;
});

/* ------------------------------- 2. Schema ------------------------------- */

check('productSchema emits no offers and no aggregateRating', () => {
  const s = code('client/src/lib/seo/schema.ts');
  return (!/offers:/.test(s) && !/aggregateRating:/.test(s)) || 'a commerce node survives';
});

check('productSchema still emits sku, mpn and brand', () => {
  const s = read('client/src/lib/seo/schema.ts');
  return (/sku:/.test(s) && /mpn:/.test(s) && /brand:/.test(s)) || 'part-number SEO fields missing';
});

/* ------------------------- 3. Commerce code is gone ---------------------- */

check('No commerce models remain', () => {
  const gone = ['Cart', 'Order', 'Coupon', 'Review'];
  const present = gone.filter((m) => fs.existsSync(path.join(ROOT, `server/src/models/${m}.ts`)));
  return present.length === 0 || `still present: ${present.join(', ')}`;
});

check('No commerce routes remain', () => {
  const gone = ['cart', 'order', 'payment', 'address'];
  const files = walk('server/src/routes').concat(walk('server/src/controllers'));
  const hit = files.filter((f) => gone.some((g) => path.basename(f).startsWith(`${g}.`)));
  return hit.length === 0 || hit.join(', ');
});

check('No commerce pages remain', () => {
  const gone = ['cart', 'checkout', 'order-confirmation', 'track-order', 'account', 'login', 'register'];
  const present = gone.filter((p) => fs.existsSync(path.join(ROOT, `client/src/app/(storefront)/${p}`)));
  const adminGone = ['orders', 'coupons', 'reviews'].filter((p) =>
    fs.existsSync(path.join(ROOT, `client/src/app/admin/${p}`)));
  return (present.length === 0 && adminGone.length === 0)
    || `${present.join(', ')} ${adminGone.join(', ')}`;
});

check('InquiryList replaced Cart and is session-only', () => {
  const s = code('server/src/models/InquiryList.ts');
  if (/\buser\b/.test(s)) return 'a user ref survives on the shortlist';
  return /sessionId: \{ type: String, required: true, unique: true/.test(s)
    || 'sessionId is not the sole identity';
});

check('Inquiry replaced Quotation and carries no quoted pricing', () => {
  const s = code('server/src/models/Inquiry.ts');
  const banned = ['quotedUnitPrice', 'quotedSubtotal', 'quotedTax', 'quotedTotal', 'validUntil', 'convertedOrder'];
  const hit = banned.filter((f) => new RegExp(`\\b${f}\\b`).test(s));
  if (hit.length > 0) return `still priced: ${hit.join(', ')}`;
  return /internalQuotedAmount/.test(s) || 'the one admin figure is missing';
});

check('Inquiry numbers use the FT-INQ prefix', () => {
  const s = read('server/src/models/Inquiry.ts');
  return /nextDocumentNumber\('inquiry', 'FT-INQ'\)/.test(s) || 'wrong document number format';
});

check('Phone is required and normalised; email is optional', () => {
  const s = code('server/src/validators/inquiry.validators.ts');
  if (!/phone: pakistaniPhoneSchema/.test(s)) return 'phone is not the required field';
  if (!/normalisePakistaniPhone/.test(s)) return 'no normalisation on the way in';
  return /email: optionalEmail/.test(s) || 'email is not optional';
});

check('Both public inquiry POSTs are rate limited and honeypotted', () => {
  // Count usages inside route registrations only — the import line at the
  // top is not a guard, and counting it made this pass for the wrong reason.
  const s = code('server/src/routes/inquiry.routes.ts');
  const blocks = s.match(/router\.post\([\s\S]*?\n\);/g) ?? [];
  if (blocks.length !== 2) return `${blocks.length} POST routes, expected 2`;
  const unguarded = blocks.filter(
    (block) => !block.includes('inquiryLimiter') || !block.includes('honeypot'),
  );
  return unguarded.length === 0 || `${unguarded.length} POST route(s) unguarded`;
});

check('The honeypot answers success rather than telling a bot it was caught', () => {
  const s = read('server/src/middleware/honeypot.ts');
  return /res\.status\(201\)/.test(s) && /success: true/.test(s)
    ? true
    : 'a 4xx here teaches the author how to get through next time';
});

check('The admin inquiry detail populates internal product figures', () => {
  const s = read('server/src/controllers/admin/inquiry.controller.ts');
  return ['+internalCost', '+lastQuotedPrice', '+supplierNotes'].every((f) => s.includes(f))
    || 'staff would have to open a second tab to price a call';
});

/* --------------------------- 4. Testimonials ----------------------------- */

check('Testimonial model exists and is publish-gated', () => {
  const s = read('server/src/models/Testimonial.ts');
  return /isPublished/.test(s) || 'no isPublished gate';
});

check('Public testimonial endpoint filters to published only', () => {
  const s = read('server/src/controllers/testimonial.controller.ts');
  return /isPublished: true/.test(s) || 'unpublished quotes are reachable';
});

check('Admin testimonials screen exists and the sidebar links to it', () => {
  const page = fs.existsSync(path.join(ROOT, 'client/src/app/admin/testimonials/page.tsx'));
  const linked = /\/admin\/testimonials/.test(read('client/src/components/admin/sidebar.tsx'));
  return (page && linked) || `page=${page} linked=${linked}`;
});

check('Homepage testimonials come from the API, not a hard-coded array', () => {
  const s = read('client/src/components/home/marketing.tsx');
  const page = read('client/src/app/(storefront)/page.tsx');
  return (!/const TESTIMONIALS =/.test(s) && /getTestimonials/.test(page)) || 'placeholders survive';
});

/* ---------------------------- 5. Dashboard ------------------------------- */

check('Dashboard reports the inquiry funnel, not revenue', () => {
  const s = code('server/src/services/dashboard.service.ts');
  if (/revenue|averageOrderValue|salesOverTime/i.test(s)) return 'a revenue metric survives';
  const keys = ['inquiries', 'winRate', 'unassigned', 'abandonedLists', 'pipeline'];
  const missing = keys.filter((k) => !s.includes(k));
  return missing.length === 0 || `missing: ${missing.join(', ')}`;
});

check('Dashboard page reads no revenue or AOV field', () => {
  const s = code('client/src/app/admin/page.tsx');
  return (!/stats\?\.revenue|averageOrderValue|ordersByStatus|salesOverTime/.test(s))
    || 'a removed field is still read';
});

/* ---------------------------- 5b. Staff auth ----------------------------- */

check('A staff sign-in page exists and middleware points at it', () => {
  const page = fs.existsSync(path.join(ROOT, 'client/src/app/admin/login/page.tsx'));
  const mw = read('client/src/middleware.ts');
  return (page && /LOGIN_PATH = '\/admin\/login'/.test(mw))
    || `page=${page}; middleware still redirects elsewhere`;
});

check('Middleware lets the sign-in page through instead of looping', () => {
  const mw = code('client/src/middleware.ts');
  return /pathname === LOGIN_PATH\) return NextResponse\.next\(\)/.test(mw)
    || 'the login page is inside /admin and would redirect to itself';
});

check('The admin shell renders the sign-in page without chrome', () => {
  const s = read('client/src/components/admin/shell.tsx');
  return /if \(bare\) return <>\{children\}<\/>/.test(s) || 'login would inherit the sidebar';
});

check('Public registration is closed', () => {
  const routes = code('server/src/routes/auth.routes.ts');
  return !/'\/register'/.test(routes) || 'POST /auth/register is still mounted';
});

check('An admin can still create a staff account', () => {
  const routes = read('server/src/routes/admin/user.routes.ts');
  const ctrl = read('server/src/controllers/admin/user.controller.ts');
  return (/createStaffSchema/.test(routes) && /export async function createStaff/.test(ctrl))
    || 'closing registration left no way to make an account';
});

/* ------------------------- 5c. Payments are gone -------------------------- */

check('No Stripe key is required to boot either workspace', () => {
  const bad = ['client/src/lib/env.ts', 'server/src/config/env.ts']
    .filter((f) => /STRIPE/.test(code(f)));
  return bad.length === 0 || bad.join(', ');
});

check('No payment method enum survives', () => {
  const bad = walk('client/src').concat(walk('server/src'))
    .filter((f) => /'jazzcash'|'easypaisa'|paymentStatus/.test(code(f)));
  return bad.length === 0 || bad.join(', ');
});

check('No order or customer-lifecycle email templates remain', () => {
  const dir = 'server/src/services/email';
  const banned = /orderConfirmationEmail|orderStatusEmail|newOrderAlertEmail|welcomeEmail|verifyEmail|abandoned/;
  const hit = walk(dir).filter((f) => banned.test(code(f)));
  return hit.length === 0 || hit.join(', ');
});

check('Auth exposes staff routes only', () => {
  const s = code('server/src/routes/auth.routes.ts');
  const banned = ['/register', '/forgot-password', '/reset-password', '/verify-email'];
  const hit = banned.filter((r) => s.includes(`'${r}'`));
  if (hit.length > 0) return `still mounted: ${hit.join(', ')}`;
  return /restrictTo\('admin', 'manager'\)/.test(s) || 'the private block is not staff-gated';
});

check('Login rejects a non-staff role after the password check', () => {
  const s = read('server/src/controllers/auth.controller.ts');
  return /STAFF_ROLES.includes\(user.role\)/.test(s) || 'no post-verification role gate';
});

check('The User model is staff-only', () => {
  const s = code('server/src/models/User.ts');
  if (/'customer'/.test(s)) return 'the customer role survives';
  const banned = ['addresses', 'companyName', 'ntn', 'isEmailVerified', 'wishlist'];
  const hit = banned.filter((f) => new RegExp(`\\b${f}\\b`).test(s));
  return hit.length === 0 || `still present: ${hit.join(', ')}`;
});

check('No payment dependency is installed', () => {
  const pkg = JSON.parse(read('server/package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hit = ['stripe', 'jazzcash', 'easypaisa'].filter((d) => d in deps);
  return hit.length === 0 || hit.join(', ');
});

check('Quotation references no Order model', () => {
  // `populate` against a deleted model throws MissingSchemaError at runtime,
  // which typechecking cannot catch.
  const bad = walk('server/src').filter((f) => /ref: 'Order'|convertedOrder/.test(read(f)));
  return bad.length === 0 || bad.join(', ');
});

check('Closing an inquiry captures why', () => {
  const model = read('server/src/models/Inquiry.ts');
  const validators = read('server/src/validators/inquiry.validators.ts');
  return (/requireLostReason/.test(model) && /lostReason/.test(validators))
    || 'an inquiry can be marked lost with no reason';
});

check('Follow-ups are append-only with a next-chase date', () => {
  const s = read('server/src/controllers/admin/inquiry.controller.ts');
  return (/followUps\.push/.test(s) && /nextFollowUpAt/.test(s)) || 'no follow-up trail';
});

check('No quotation or enquiry identifier survives in code', () => {
  const stale = /\b(Quotation|quoteNumber|quotedTotal|EnquiryDocument|enquiryReport)\b/;
  const hit = walk('server/src').filter((f) => stale.test(code(f)));
  return hit.length === 0 || hit.join(', ');
});

/* ------------------------------ 6. Routing ------------------------------- */

check('robots blocks the shortlist, admin and style guide', () => {
  const s = read('client/src/app/robots.ts');
  return ['/inquiry-list', '/submit-inquiry', '/admin', '/style-guide'].every((r) => s.includes(`'${r}'`))
    || 'a private route is crawlable';
});

check('robots, sitemap and page metadata agree on the private routes', () => {
  // Three places have to say the same thing about a page, and they drift.
  const robots = read('client/src/app/robots.ts');
  const sitemap = read('client/src/app/sitemap.ts');
  const submitPage = read('client/src/app/(storefront)/submit-inquiry/page.tsx');

  for (const route of ['/inquiry-list', '/submit-inquiry']) {
    if (!robots.includes(`'${route}'`)) return `robots does not block ${route}`;
    if (sitemap.includes(`'${route}'`)) return `sitemap still advertises ${route}`;
  }
  return /noIndex: true/.test(submitPage) || 'the submit page is missing noIndex';
});

check('The submit form posts the shortlist and honours the honeypot', () => {
  const form = read('client/src/components/inquiry/submit-inquiry-form.tsx');
  if (!/items: items\.map/.test(form)) return 'the form does not send its items';
  if (!/register\('website'\)/.test(form)) return 'no honeypot field is rendered';
  // Clearing before the server confirms would lose the list on any failure.
  return /onSuccess: \(data\) => \{[\s\S]*?clear\(\)/.test(form)
    || 'the list is cleared outside onSuccess';
});

check('sitemap lists no removed route', () => {
  const s = read('client/src/app/sitemap.ts');
  const dead = ['/cart', '/checkout', '/login', '/register', '/account', '/track-order'];
  const hit = dead.filter((d) => s.includes(`'${d}'`));
  return hit.length === 0 || hit.join(', ');
});

check('Every storefront route on disk is reachable and none are orphaned', () => {
  const dir = path.join(ROOT, 'client/src/app/(storefront)');
  const routes = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const expected = ['about', 'brands', 'categories', 'contact', 'faq', 'industries',
    'inquiry-list', 'privacy-policy', 'products', 'shipping-returns', 'source-from-china',
    'style-guide', 'submit-inquiry', 'terms'].sort();
  return JSON.stringify(routes) === JSON.stringify(expected)
    || `on disk: ${routes.join(', ')}`;
});

/* --------------------- 6b. Client/server API contract -------------------- */

/*
 * Two silent-failure classes, both of which shipped and neither of which
 * `tsc` can see. They only surface as a runtime crash or, worse, a filter
 * that quietly does nothing.
 */

check('No Server Component imports a value from a "use client" module', () => {
  /*
   * Importing a named export from a `'use client'` file gives a Server
   * Component a client *reference proxy*, not the binding — so calling it
   * throws "x is not a function" at request time. Uppercase names are
   * excluded: those are components, and that is the boundary working as
   * designed.
   */
  const files = walk('client/src');
  const isClient = new Map(files.map((f) => [f, /^\s*['"]use client['"]/.test(read(f))]));

  const resolve = (spec, from) => {
    if (!spec.startsWith('@/') && !spec.startsWith('.')) return null;
    const base = spec.startsWith('@/')
      ? path.join('client/src', spec.slice(2))
      : path.posix.join(path.posix.dirname(from), spec);
    for (const c of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
      if (fs.existsSync(path.join(ROOT, c))) return c;
    }
    return null;
  };

  const hits = [];
  for (const f of files) {
    if (isClient.get(f)) continue;
    const re = /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(read(f))) !== null) {
      if (m[1]) continue;
      const target = resolve(m[3], f);
      if (!target || !isClient.get(target)) continue;
      const named = m[2].match(/\{([\s\S]*)\}/);
      if (!named) continue;
      const values = named[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith('type '))
        .map((s) => s.split(/\s+as\s+/)[0].trim())
        .filter((s) => /^[a-z]/.test(s));
      if (values.length > 0) hits.push(`${f} → ${m[3]} [${values.join(', ')}]`);
    }
  }
  return hits.length === 0 || hits.join('; ');
});

check('The catalogue query the client sends is one the API accepts', () => {
  // Zod strips unknown keys and 422s an unknown sort, so drift here is a
  // filter that silently returns everything.
  const server = code('server/src/validators/catalog.validators.ts');
  const client = code('client/src/lib/api/catalog.ts');

  const sorts = server.match(/PRODUCT_SORTS = \[([^\]]*)\]/);
  if (!sorts) return 'PRODUCT_SORTS not found on the server';
  const expected = sorts[1].match(/'([^']+)'/g).map((s) => s.replace(/'/g, '')).sort();

  const params = client.match(/interface ProductQueryParams \{([\s\S]*?)\n\}/);
  if (!params) return 'ProductQueryParams not found on the client';
  const sortLine = params[1].match(/sort\?:([^;]*);/);
  if (!sortLine) return 'no sort on ProductQueryParams';
  const actual = (sortLine[1].match(/'([^']+)'/g) || [])
    .map((s) => s.replace(/'/g, '')).sort();

  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    return `sorts differ — server [${expected}] vs client [${actual}]`;
  }

  // Every client-side key must exist in the server schema.
  const keys = [...params[1].matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
  const unknown = keys.filter(
    (k) => !['page', 'limit'].includes(k) && !new RegExp(`\\b${k}:`).test(server),
  );
  return unknown.length === 0 || `client sends keys the API ignores: ${unknown.join(', ')}`;
});

check('The admin dashboard types match the stats the API returns', () => {
  /*
   * The client declares its own `DashboardStats`, so `tsc` has nothing to
   * compare it against. It drifted straight through the pivot — still naming
   * `enquiries`, `quotations` and `quotationWinRate` after the API had moved
   * to `inquiries`, `byStatus` and `winRate` — and the first anyone knew was
   * the admin shell crashing on `stats.quotations.new`.
   */
  const keys = (src, name) => {
    const m = new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(src);
    return m ? [...m[1].matchAll(/^ {2}(\w+)\??:/gm)].map((x) => x[1]).sort() : null;
  };

  const server = code('server/src/services/dashboard.service.ts');
  const client = code('client/src/lib/api/admin.ts');
  const problems = [];

  for (const name of ['DashboardStats', 'DashboardCharts']) {
    const a = keys(server, name);
    const b = keys(client, name);
    if (!a || !b) {
      problems.push(`${name} not found on ${a ? 'the client' : 'the server'}`);
      continue;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      problems.push(`${name}: server [${a}] vs client [${b}]`);
    }
  }
  return problems.length === 0 || problems.join('; ');
});

check('The admin links only to admin routes that exist', () => {
  const dir = path.join(ROOT, 'client/src/app/admin');
  const routes = new Set(
    fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name),
  );

  const dead = new Set();
  for (const file of walk('client/src').filter((f) => f.endsWith('.tsx'))) {
    for (const m of code(file).matchAll(/href=\{?["'`]\/admin\/([a-z0-9-]+)/g)) {
      if (!routes.has(m[1])) dead.add(`${m[1]} (${file})`);
    }
  }
  return dead.size === 0 || `no such route: ${[...dead].join(', ')}`;
});

check('The facet shape the sidebar reads is the one the API returns', () => {
  const shape = (s) => {
    const m = s.match(/interface ProductFacets \{([\s\S]*?)\n\}/);
    return m ? [...m[1].matchAll(/^\s*(\w+):/gm)].map((x) => x[1]).sort() : null;
  };
  const server = shape(code('server/src/services/catalog.facets.ts'));
  const client = shape(code('client/src/lib/api/types.ts'));
  if (!server || !client) return 'ProductFacets not found on one side';
  return (
    JSON.stringify(server) === JSON.stringify(client)
    || `server [${server}] vs client [${client}]`
  );
});

/* ------------------------------ 6c. Imagery ------------------------------ */

check('Seed imagery is local and every file exists', () => {
  /*
   * A `placehold.co` URL in the banner seed took the home page down: any
   * hostname missing from `remotePatterns` makes `next/image` throw, and a
   * seed that renders only while a stranger's CDN is up is not a seed.
   */
  const dir = 'server/src/seed/data';
  const problems = [];

  for (const file of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.ts'))) {
    const src = read(`${dir}/${file}`);

    for (const m of src.matchAll(/(?:image|mobileImage|logo|icon)\s*:\s*['"`](https?:\/\/[^'"`]+)['"`]/g)) {
      problems.push(`${file} points at a remote host: ${m[1]}`);
    }
    for (const m of src.matchAll(/['"`](\/[^'"`\s]+\.(?:svg|png|jpg|jpeg|webp|avif))['"`]/g)) {
      if (!fs.existsSync(path.join(ROOT, 'client/public', m[1]))) {
        problems.push(`${file} references a missing file: ${m[1]}`);
      }
    }
  }
  return problems.length === 0 || problems.join('; ');
});

check('SVG placeholders bypass the optimizer rather than unlocking it', () => {
  /*
   * `/_next/image` returns 400 for `image/svg+xml`, which is why every
   * placeholder rendered as alt text. The fix is `unoptimized` on vector
   * sources — NOT `dangerouslyAllowSVG`, which would also admit an SVG from
   * any allowed remote host and buys nothing for a 2 kB local vector.
   */
  const config = read('client/next.config.mjs');
  if (/^\s*dangerouslyAllowSVG:\s*true/m.test(config)) {
    return 'dangerouslyAllowSVG was switched on; use `unoptimized` on vectors instead';
  }
  const lib = code('client/src/lib/images.ts');
  return /export function imageProps/.test(lib) || 'imageProps is gone from lib/images.ts';
});

check('Logo assets referenced by the component all exist', () => {
  const s = read('client/src/components/layout/logo.tsx');
  const missing = [...s.matchAll(/'(\/brand\/[^']+)'/g)]
    .map((m) => m[1])
    .filter((p) => !fs.existsSync(path.join(ROOT, 'client/public', p)));
  return missing.length === 0 || `missing: ${[...new Set(missing)].join(', ')}`;
});

check('Every page gets an OG share card', () => {
  // A bare URL with no preview reads like spam in WhatsApp, which is where
  // most of these links get pasted.
  const s = code('client/src/lib/seo/index.ts');
  if (!/DEFAULT_OG_IMAGE\s*=\s*'([^']+)'/.test(s)) return 'no DEFAULT_OG_IMAGE';
  const file = /DEFAULT_OG_IMAGE\s*=\s*'([^']+)'/.exec(s)[1];
  if (!fs.existsSync(path.join(ROOT, 'client/public', file))) return `${file} does not exist`;
  return /images: \[\{ url: ogImage/.test(s) || 'openGraph images is still conditional';
});

check('The image guard behaves (executed, not just asserted)', () => {
  const { execFileSync } = require('node:child_process');
  try {
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', path.join(__dirname, 'image-guard.mjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return true;
  } catch (error) {
    return (error.stderr || error.stdout || error.message).trim().slice(0, 200);
  }
});

check('Every database-supplied image goes through the guard', () => {
  /*
   * A raw `src={something.url}` is one admin typo away from throwing inside a
   * Server Component and taking the whole route down. Local `/placeholders/…`
   * literals are fine — they are ours and they exist.
   */
  const offenders = [];
  for (const file of walk('client/src').filter((f) => f.endsWith('.tsx'))) {
    const src = code(file);
    for (const m of src.matchAll(/<Image\b[^>]*?\bsrc=\{([^}]+)\}/g)) {
      const expr = m[1].trim();
      if (expr.startsWith('safeImageSrc(') || /^['"`]\//.test(expr)) continue;
      // A local variable already resolved through the guard is acceptable.
      if (/^\w+$/.test(expr) && new RegExp(`(const|let)\\s+${expr}\\s*=\\s*safeImageSrc\\(`).test(src)) continue;
      offenders.push(`${file}: src={${expr}}`);
    }
  }
  return offenders.length === 0 || offenders.join('; ');
});

check('The guard allow-list matches next.config remotePatterns', () => {
  const hosts = (s, re) => [...s.matchAll(re)].map((m) => m[1]).sort();
  const configured = hosts(read('client/next.config.mjs'), /hostname:\s*'([^']+)'/g);
  const allowed = hosts(read('client/src/lib/images.ts'), /'([a-z0-9.-]+\.[a-z]{2,})'/g);
  return (
    JSON.stringify(configured) === JSON.stringify(allowed)
    || `next.config [${configured}] vs images.ts [${allowed}]`
  );
});

check('Banner links point at routes that exist', () => {
  const routes = fs.readdirSync(path.join(ROOT, 'client/src/app/(storefront)'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name);
  const src = read('server/src/seed/data/banners.ts');
  const dead = [...src.matchAll(/link:\s*'\/([^'/]+)/g)]
    .map((m) => m[1])
    .filter((segment) => !routes.includes(segment));
  return dead.length === 0 || `no such route: ${[...new Set(dead)].join(', ')}`;
});

/* --------------------------- 6d. Inquiry pipeline ------------------------ */

check('The export accepts every filter the list does', () => {
  /*
   * The export button sits on the list and reads as "download what I am
   * looking at". Zod strips unknown keys, so a filter the list offers but the
   * export schema omits silently widens the download — which is how the wrong
   * list reaches a supplier.
   */
  const src = code('server/src/validators/inquiry.validators.ts');

  /*
   * Bound the slice at the next `export const`, not at the first `})`.
   * `adminInquiryQuerySchema` is `paginationSchema.extend({…}).refine(…)`, so
   * a lazy match to `})` stops inside it and then runs on into whatever
   * follows — which is how this check first reported `note` and
   * `nextFollowUpAt`, fields belonging to the follow-up schema entirely.
   */
  /*
   * Schema parity is necessary but not sufficient: the two used to build their
   * Mongo filters separately, so they could accept the same query string and
   * still search differently. Assert they share one builder.
   */
  const listSrc = code('server/src/controllers/admin/inquiry.controller.ts');
  const exportSrc = code('server/src/controllers/admin/inquiry-export.controller.ts');
  if (
    !listSrc.includes('buildInquiryFilter(query)') ||
    !exportSrc.includes('buildInquiryFilter(query)') ||
    /const filter: FilterQuery<IInquiry> = \{/.test(exportSrc)
  ) {
    return 'the export builds its own Mongo filter instead of sharing buildInquiryFilter';
  }

  const block = (name) => {
    const start = src.indexOf(`${name} =`);
    if (start === -1) return null;
    const after = src.indexOf('export const', start + name.length);
    let slice = src.slice(start, after === -1 ? undefined : after);

    // `.refine(fn, { message, path })` carries option keys at the same
    // indent as real fields. Everything after the first refine is options.
    const refine = slice.indexOf('.refine(');
    if (refine !== -1) slice = slice.slice(0, refine);

    return [...slice.matchAll(/^\s{2,4}(\w+):/gm)].map((x) => x[1]);
  };

  const list = block('adminInquiryQuerySchema');
  const exp = block('inquiryExportQuerySchema');
  if (!list || !exp) return 'one of the two schemas was not found';

  // `sort`, `page` and `limit` shape the view, not the set of rows.
  const viewOnly = new Set(['sort', 'page', 'limit']);
  const missing = list.filter((key) => !viewOnly.has(key) && !exp.includes(key));
  return missing.length === 0 || `export ignores: ${missing.join(', ')}`;
});

check('Bulk status changes cannot set "lost"', () => {
  // The model demands a reason for a loss, and one reason pasted across
  // twenty inquiries makes the lost-reason report worthless.
  const src = code('server/src/validators/inquiry.validators.ts');
  const m = /bulkInquirySchema = [\s\S]*?\n  \)/.exec(src);
  if (!m) return 'bulkInquirySchema not found';
  return !/'lost'/.test(m[0]) || 'bulk accepts lost, which skips the reason requirement';
});

check('Literal admin inquiry routes are declared before /:id', () => {
  /*
   * `router.patch('/:id')` above `router.patch('/bulk')` would make Express
   * match "bulk" as an ObjectId and never reach the bulk handler — a 422 that
   * looks like a validation bug and is actually a routing bug. Ordering is
   * load-bearing here, so assert it rather than trusting review.
   */
  const src = code('server/src/routes/admin/inquiry.routes.ts');
  const at = (re) => src.search(re);
  const param = at(/router\.(get|patch|delete)\(\s*'\/:id/);
  if (param === -1) return 'no /:id route found';

  const literals = [/router\.get\(\s*'\/export/, /router\.patch\(\s*'\/bulk/];
  const late = literals.filter((re) => at(re) === -1 || at(re) > param);
  return late.length === 0 || `a literal route is declared after /:id and will never match`;
});

check('No string-literal type assertions in the client', () => {
  /*
   * `<StockBadge status={row.stock as 'in_stock'} />` is how the style guide
   * crashed the production build. The value was an `Availability`
   * (`ready_stock`), the badge speaks stock levels (`in_stock`), and the cast
   * told `tsc` to stop asking. At runtime the lookup returned `undefined` and
   * destructuring it threw during prerender.
   *
   * A cast to a single string literal is almost always someone silencing a
   * genuine mismatch. `as const` is fine and excluded.
   */
  const offenders = [];

  for (const file of walk('client/src')) {
    // `code()` strips comments, so the notes explaining this rule do not trip it.
    for (const m of code(file).matchAll(/as '([a-z][a-z0-9_]*)'/g)) {
      offenders.push(`${file}: as '${m[1]}'`);
    }
  }

  return offenders.length === 0 || `string-literal casts:\n         ${offenders.join('\n         ')}`;
});

check('Declared logo dimensions match the actual artwork', () => {
  /*
   * `next/image` reserves space from the width/height it is given, not from
   * the file. Swap in a re-exported logo at a different aspect ratio and the
   * header silently starts shifting on load — a Core Web Vitals regression
   * with no error anywhere.
   *
   * Reads the PNG IHDR chunk directly: bytes 16-20 are width, 20-24 height.
   * No dependency, no build step.
   */
  const pngSize = (rel) => {
    const buf = fs.readFileSync(path.join(ROOT, 'client', 'public', rel));
    if (buf.subarray(1, 4).toString() !== 'PNG') return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  };

  const src = read('client/src/components/layout/logo.tsx');
  const wrong = [];

  // Each lockup block: the dark asset path, then its declared width/height.
  for (const m of src.matchAll(
    /dark: '(\/brand\/[^']+)',[\s\S]*?width: (\d+),\s*\n\s*height: (\d+),/g,
  )) {
    const [, asset, w, h] = m;
    const actual = pngSize(asset);
    if (!actual) continue;
    if (actual.width !== Number(w) || actual.height !== Number(h)) {
      wrong.push(`${asset} is ${actual.width}x${actual.height}, declared ${w}x${h}`);
    }
  }

  if (wrong.length > 0) return wrong.join('; ');
  return true;
});

check('The sub-category select only offers children of the chosen category', () => {
  /*
   * The select used to list every nested category, so a product could be filed
   * as "Control Components" + "Sensors" — and Sensors lives under Automation.
   * The record saved exactly as entered and then appeared under neither: no
   * chip on the category page, and the sub-category filter matched nothing.
   * It read as "the fields I chose were thrown away".
   *
   * Both halves are asserted: the form must filter by parent, and the service
   * must reject a mismatched pair for the CSV importer and direct API callers.
   */
  const form = code('client/src/components/admin/products/form-tab-basic.tsx');
  if (!/item\.parent === watch\('category'\)/.test(form)) {
    return 'the sub-category select no longer filters by the chosen category';
  }

  const service = code('server/src/services/product.admin.service.ts');
  if (!/not a sub-category of the category you selected/.test(service)) {
    return 'the service no longer rejects a sub-category from a different parent';
  }

  // A patch that sets only `subCategory` must still be checked against the
  // category already on the product, or the rule is bypassed in two requests.
  return (
    /input\.category \?\? String\(product\.category\)/.test(service) ||
    'updateProduct validates only the patch, so parentage can be bypassed'
  );
});

check('Admin writes flush the storefront cache', () => {
  /*
   * The storefront is ISR. Deactivating a product left it on the homepage
   * until the `revalidate` window expired — five minutes of an item still
   * being offered while the operator watched an unchanged page and concluded
   * the Active toggle was broken.
   *
   * Several fetches carried `tags` from the start, but nothing called
   * `revalidateTag`, so those tags did nothing whatsoever. Both halves have to
   * exist: the tag on the fetch, and the flush on the write.
   */
  const bad = [];

  /*
   * 1. The product LIST must be taggable, or nothing can invalidate the
   *    homepage rails. Scoped to `getProducts` deliberately: a looser match
   *    was satisfied by the detail fetch's own tag and passed while the list
   *    had none — the exact hole this check exists to close.
   */
  const catalogue = code('client/src/lib/api/catalog.ts');
  const listFn = /export function getProducts\([\s\S]*?\n\}/.exec(catalogue);
  if (!listFn) bad.push('getProducts not found');
  else if (!/tags: \['products'/.test(listFn[0])) {
    bad.push("getProducts no longer tags its fetches with 'products'");
  }

  // 2. Something must actually call revalidateTag.
  const route = 'client/src/app/api/revalidate/route.ts';
  if (!fs.existsSync(path.join(ROOT, route))) bad.push('the revalidate route handler is missing');
  else if (!/revalidateTag\(/.test(read(route))) bad.push('the revalidate route never calls revalidateTag');

  // 3. Every product write must flush. Deactivation is the one that started this.
  const products = code('server/src/controllers/admin/product.controller.ts');
  for (const fn of ['createProduct', 'updateProduct', 'deleteProduct']) {
    const block = new RegExp(`export async function ${fn}[\\s\\S]*?\\n\\}`).exec(products);
    if (!block) { bad.push(`${fn} not found`); continue; }
    if (!/revalidate\(\[/.test(block[0])) bad.push(`${fn} does not flush the storefront cache`);
  }

  return bad.length === 0 || bad.join('; ');
});

check('The China sourcing rename left nothing behind', () => {
  /*
   * `/sourcing-request` became `/source-from-china`. Next.js resolves hrefs at
   * runtime, so a stale link compiles, builds and 404s — the same failure mode
   * as the `/category` vs `/categories` bug.
   *
   * Also guards the find-and-replace hazard that produced "China China
   * sourcing requests" in the admin guide on the first pass: prefixing a term
   * that a more specific rule had already prefixed.
   */
  const bad = [];

  for (const file of walk('client/src')) {
    if (/sourcing-request/.test(read(file))) bad.push(`${file} still links /sourcing-request`);
  }

  for (const root of ['client/src', 'server/src']) {
    for (const file of walk(root)) {
      if (/China China/.test(read(file))) bad.push(`${file} says "China China"`);
    }
  }

  /*
   * The identifiers are deliberately untouched: renaming `sourcing_request`
   * would mean migrating stored inquiries for no user-visible gain. Compare
   * the two `InquiryType` unions rather than merely checking the string is
   * present somewhere — a partial rename leaves other occurrences behind and
   * a presence test sails straight past it, which is how this check first
   * passed on a deliberately broken model.
   */
  const union = (file) => {
    const m = /export type InquiryType =([^;]+);/.exec(read(file));
    return m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort().join(',') : null;
  };

  const serverTypes = union('server/src/types/inquiry.types.ts');
  const clientTypes = union('client/src/types/inquiry.types.ts');

  if (!serverTypes || !clientTypes) bad.push('InquiryType union not found on one side');
  else if (serverTypes !== clientTypes) bad.push(`InquiryType drift — server [${serverTypes}] vs client [${clientTypes}]`);
  else if (!serverTypes.includes('sourcing_request')) {
    bad.push('the stored inquiry type is no longer `sourcing_request` — existing records would orphan');
  }

  return bad.length === 0 || bad.join('; ');
});

check('Optional fields can be cleared, not only set', () => {
  /*
   * The shared admin CRUD screen dropped blank values from an edit payload, so
   * an operator could never remove an optional value — clearing a field sent a
   * PATCH that omitted it, the old value survived, and the toast still said
   * "updated". `null` is the unset signal, so the screen must send it and the
   * update schemas must accept it.
   */
  const screen = code('client/src/components/admin/crud/resource-screen.tsx');
  if (!/value === '' && optional\.has\(key\) \? null : value/.test(screen)) {
    return 'the CRUD screen no longer converts cleared optional fields to null';
  }

  // `createSchema.partial()` makes fields optional but NOT nullable, which is
  // what made this impossible server-side.
  const taxonomy = code('server/src/validators/admin.taxonomy.validators.ts');
  const misc = code('server/src/validators/misc.validators.ts');

  const partialUpdates = [
    ...taxonomy.matchAll(/export const (update\w+Schema) = \w+\s*\n?\s*\.partial\(\)/g),
    ...misc.matchAll(/export const (update\w+Schema) = \w+\s*\n?\s*\.partial\(\)/g),
  ].map((m) => m[1]);

  return (
    partialUpdates.length === 0 ||
    `these update schemas use .partial(), so nothing can be cleared: ${partialUpdates.join(', ')}`
  );
});

check('No code identifier leaks into a user-facing label', () => {
  /*
   * The pivot's `price` -> `lastQuotedPrice` rename was applied to strings as
   * well as identifiers, so the product form shipped a field labelled
   * "Selling lastQuotedPrice (Rs.)" and the table a column called
   * "Internal lastQuotedPrice". Both render, both typecheck, both are wrong in
   * front of the client.
   *
   * A camelCase word inside a label, placeholder, hint or title is almost
   * always a variable name that escaped.
   */
  const offenders = [];

  for (const file of walk('client/src')) {
    if (!file.endsWith('.tsx')) continue;
    const src = read(file);

    for (const m of src.matchAll(/(?:label|placeholder|hint|title)="([^"]*)"/g)) {
      /*
       * Five characters minimum: two lowercase, a capital, then two more.
       * That is the shape of `lastQuotedPrice`, `subCategory`, `isNewArrival`
       * — and it excludes the electrical units this catalogue is full of.
       * `36 kA`, `415 kV`, `5 kVA` all have a single leading lowercase letter,
       * so they never match. A digit lookbehind was not enough: the spec text
       * writes "36 kA" with a space.
       */
      for (const word of m[1].matchAll(/\b[a-z]{2,}[A-Z][A-Za-z]{2,}\b/g)) {
        offenders.push(`${file}: "${word[0]}" in "${m[1].slice(0, 48)}"`);
      }
    }
  }

  return offenders.length === 0 || `identifiers in UI text:\n         ${offenders.join('\n         ')}`;
});

check('Every product form field has a control', () => {
  /*
   * `availability` sat in the form schema with a default and no input, so every
   * product created in the admin was permanently "Available on Order" and the
   * "Stock on hand" box did nothing to the storefront. `subCategory` had the
   * same problem. A schema field with no control is a setting the operator can
   * never reach, and nothing else in the toolchain notices.
   */
  const schema = read('client/src/components/admin/products/form-schema.ts');
  const block = /productFormSchema = z\n?\s*\.object\(\{([\s\S]*?)\n  \}\)/.exec(schema);
  if (!block) return 'productFormSchema object not found';

  const fields = [...block[1].matchAll(/^    (\w+):/gm)].map((m) => m[1]);
  if (fields.length === 0) return 'no fields parsed from the schema';

  /*
   * Scan the whole product-admin directory, not a hardcoded list. The first
   * version named three files; splitting `form-tabs.tsx` moved `BasicTab` into
   * a fourth and the check immediately reported eight healthy fields as
   * missing. A list of filenames is a second thing to keep in sync, which is
   * the bug this check exists to prevent.
   */
  const src = walk('client/src/components/admin/products')
    .map((f) => read(f))
    .join('\n');

  /*
   * WRITES only. `watch('x')` is a read — the live preview watching a field
   * does not mean an operator can change it, and that is exactly how
   * `availability` hid: the preview read it while nothing on the form set it.
   * Counting reads made the check pass on the very bug it exists to catch.
   */
  const wired = (name) =>
    src.includes(`register('${name}')`) ||
    src.includes(`setValue('${name}'`) ||
    // Repeaters take the field name as a prop: name="variants" / name={'x'}.
    src.includes(`name="${name}"`) ||
    src.includes(`name={'${name}'}`) ||
    // Flag rows come from a tuple list: ['isNewArrival', 'New arrival'].
    new RegExp(`\\['${name}',`).test(src);

  const missing = fields.filter((name) => !wired(name));
  return missing.length === 0 || `schema fields with no control: ${missing.join(', ')}`;
});

check('Every product form field reaches the API payload', () => {
  /*
   * The sibling of the check above, and the one that was actually missing.
   *
   * `availability`, `leadTime` and `datasheets` all had working controls — the
   * operator picked "Ready Stock", the live preview showed "Ready Stock", the
   * save succeeded — but `toApiPayload` never read them, so they were not in
   * the request body at all. On create Mongoose applied its default; on edit
   * the old value simply stayed. No error, no warning, and a preview that
   * agreed with the operator rather than with the server.
   *
   * A control proves a field can be *edited*. Only this proves it is *sent*.
   */
  const schema = read('client/src/components/admin/products/form-schema.ts');

  const block = /productFormSchema = z\n?\s*\.object\(\{([\s\S]*?)\n  \}\)/.exec(schema);
  if (!block) return 'productFormSchema object not found';
  const fields = [...block[1].matchAll(/^    (\w+):/gm)].map((m) => m[1]);
  if (fields.length === 0) return 'no fields parsed from the schema';

  const payload = /export function toApiPayload[\s\S]*?\n\}/.exec(code('client/src/components/admin/products/form-schema.ts'));
  if (!payload) return 'toApiPayload not found';

  /*
   * Match on the read, `values.x`, not on the emitted key. Three fields are
   * deliberately renamed on the way out (`seoTitle` → `seo.title`), and a key
   * comparison would have to carry an alias map — a second list to keep in
   * sync, which is the class of bug this file exists to catch.
   */
  const read_ = new Set([...payload[0].matchAll(/values\.(\w+)/g)].map((m) => m[1]));

  const dropped = fields.filter((name) => !read_.has(name));
  return dropped.length === 0 || `silently dropped before the request: ${dropped.join(', ')}`;
});

check('Every field the product form sends is accepted by the server', () => {
  /*
   * The other half of the round trip, and the half that actually bit.
   *
   * `toApiPayload` sent `stock`, but `updateProductSchema` had no such key.
   * Zod strips unknown keys silently rather than complaining, so the figure
   * typed into "Stock on hand" was dropped on every edit — and because the
   * product stayed at zero, the `demoteEmptyReadyStock` hook then reverted the
   * operator's "Ready Stock" to "Available on Order". Two correct-looking
   * pieces, a 200 response, and the opposite of what was asked for.
   *
   * A field the client sends and the server ignores is invisible from both
   * ends. Nothing in TypeScript spans the wire, so it has to be checked here.
   */
  const payload = /export function toApiPayload[\s\S]*?\n\}/.exec(
    code('client/src/components/admin/products/form-schema.ts'),
  );
  if (!payload) return 'toApiPayload not found';

  /* Keys as emitted: plain `key:` rows and `...(cond ? { key: … } : {})` rows. */
  const emitted = new Set();
  for (const line of payload[0].split('\n')) {
    const plain = /^    (\w+):/.exec(line);
    const spread = /^    \.\.\.\([^?]*\?\s*\{\s*(\w+):/.exec(line);
    if (plain) emitted.add(plain[1]);
    else if (spread) emitted.add(spread[1]);
  }
  if (emitted.size === 0) return 'no keys parsed from toApiPayload';

  const validators = code('server/src/validators/admin.catalog.validators.ts');
  const keysOf = (name) => {
    const found = new RegExp(`${name} = z[\\s\\S]*?\\.object\\(\\{([\\s\\S]*?)\\n  \\}\\)`).exec(validators);
    return found ? new Set([...found[1].matchAll(/^    (\w+):/gm)].map((m) => m[1])) : null;
  };

  const create = keysOf('createProductSchema');
  const update = keysOf('updateProductSchema');
  if (!create || !update) return 'product validator schemas not found';

  const gaps = [];
  for (const key of emitted) {
    if (!create.has(key)) gaps.push(`${key} (create)`);
    if (!update.has(key)) gaps.push(`${key} (update)`);
  }

  return gaps.length === 0 || `sent but silently stripped by the server: ${gaps.join(', ')}`;
});

check('Product form mirrors the server invariants', () => {
  /*
   * Both refines exist on `createProductSchema`. Without a matching pair on the
   * client the server rejects the save with a 422 that the form renders as a
   * generic "Could not save" toast — the operator is told something is wrong
   * but not which of thirty fields, which is barely better than silence.
   */
  const client = code('client/src/components/admin/products/form-schema.ts');
  const missing = [];

  if (!/availability !== 'ready_stock' \|\| .*stock > 0/.test(client)) {
    missing.push('ready_stock requires stock > 0');
  }
  if (!/isImportItem \|\| Boolean\(.*leadTime\)/.test(client)) {
    missing.push('import item requires a lead time');
  }

  return missing.length === 0 || `client does not enforce: ${missing.join('; ')}`;
});

check('Modal panels are not painted behind their own backdrop', () => {
  /*
   * `DialogOverlay` carries `backdrop-blur`, which filters everything painted
   * behind it. The drawer used `z-drawer` (60) while the overlay used
   * `z-modal` (70), so the panel sat *behind* the backdrop and blurred and
   * tinted itself — the entire admin screen, drawer included, looked out of
   * focus while an edit panel was open.
   *
   * Neither `tsc` nor ESLint can see this: both class names are valid, the
   * component renders, nothing throws. So compare the numbers.
   */
  const dialog = code('client/src/components/ui/dialog.tsx');
  const config = read('client/tailwind.config.ts');

  const scale = {};
  const scaleBlock = /zIndex: \{([^}]*)\}/.exec(config);
  if (!scaleBlock) return 'zIndex scale not found in tailwind.config.ts';
  for (const m of scaleBlock[1].matchAll(/(\w+): '(\d+)'/g)) scale[m[1]] = Number(m[2]);

  const levelOf = (snippet) => {
    const m = /z-([a-z]+)/.exec(snippet);
    return m ? scale[m[1]] : undefined;
  };

  const overlay = /DialogPrimitive\.Overlay[\s\S]*?className=[\s\S]*?'([^']*z-[a-z]+[^']*)'/.exec(dialog);
  if (!overlay) return 'could not find the overlay className';
  const overlayZ = levelOf(overlay[1]);
  if (overlayZ === undefined) return 'overlay uses a z-index outside the scale';

  // Every panel that shares the portal with that overlay.
  const panels = [...dialog.matchAll(/'fixed[^']*\bz-([a-z]+)\b[^']*'/g)]
    .map((m) => m[1])
    .filter((name) => scale[name] !== undefined);

  const behind = panels.filter((name) => scale[name] < overlayZ);
  return (
    behind.length === 0 ||
    `panel z-${behind.join(', z-')} sits below the blurring overlay (z-${overlayZ})`
  );
});

check('Every brand slug has a logo file', () => {
  /*
   * `BrandLogo` builds its `src` from the slug — `/brand/logos/${slug}.png` —
   * so the path never appears as a literal anywhere and the asset check above
   * skips it. Without this, adding a thirteenth brand would render a broken
   * image in the footer of every page and nothing would notice.
   *
   * The seed is the source of truth: it is what populates the database that
   * the storefront reads.
   */
  const seed = read('server/src/seed/data/brands.ts');
  const slugs = [...seed.matchAll(/slug: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  if (slugs.length === 0) return 'no brand slugs found in the seed';

  const missing = slugs.filter(
    (slug) => !fs.existsSync(path.join(ROOT, 'client', 'public', 'brand', 'logos', `${slug}.png`)),
  );

  // Lower case matters: macOS resolves `Terasaki.png` for `terasaki.png`,
  // Vercel's Linux hosts do not. A capitalised file passes locally and 404s
  // in production, so check the real directory listing too.
  const dir = path.join(ROOT, 'client', 'public', 'brand', 'logos');
  const wrongCase = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f !== f.toLowerCase())
    : [];

  if (missing.length > 0) return `brands with no logo file: ${missing.join(', ')}`;
  return wrongCase.length === 0 || `logo filenames must be lower case: ${wrongCase.join(', ')}`;
});

check('Every referenced static asset exists on disk', () => {
  /*
   * A wrong image path does not fail the build, does not fail `tsc`, and does
   * not throw — `next/image` renders a broken box and the page still returns
   * 200. Nobody finds out until somebody looks at that page on that device.
   *
   * Covers both `public/` paths written in code (logos, placeholders, OG and
   * manifest icons) and the ones in the seed, which is how a fresh database
   * gets its banner artwork.
   */
  const roots = ['client/src', 'server/src/seed'];
  const missing = new Set();

  for (const root of roots) {
    for (const file of walk(root)) {
      /*
       * `code()`, not `read()`. A doc comment explaining the naming rule —
       * "`terasaki` → `/brand/logos/terasaki.png`" — is not a reference, but
       * the raw text looks exactly like one, so this reported a phantom
       * missing asset for a path no code actually requests.
       */
      const src = code(file);
      // Any string literal that looks like a root-relative asset path.
      for (const m of src.matchAll(/['"`](\/(?:brand|placeholders)\/[A-Za-z0-9._/-]+)['"`]/g)) {
        const asset = m[1];
        // Skip anything with a template hole — those cannot be checked here.
        if (asset.includes('$')) continue;
        if (!fs.existsSync(path.join(ROOT, 'client', 'public', asset))) {
          missing.add(`${asset}  (referenced in ${file})`);
        }
      }
    }
  }

  return missing.size === 0 || `missing assets:\n         ${[...missing].join('\n         ')}`;
});

check('Every internal link points at a route that exists', () => {
  /*
   * The entire primary navigation shipped pointing at `/category/<slug>` while
   * the route was `/categories/[slug]` — mega-menu, mobile nav, footer and the
   * 404 page. Next.js resolves hrefs at runtime, so nothing failed to compile
   * and nothing failed to build; every category link simply 404'd.
   *
   * Collect the top-level segment of every internal href and check a matching
   * route directory exists. Dynamic segments are ignored — the point is to
   * catch `/category` vs `/categories`, not to validate slugs.
   */
  const appDir = path.join(ROOT, 'client', 'src', 'app');

  const routes = new Set();
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // Route groups `(x)` are transparent in the URL; recurse through them.
      if (name.startsWith('(')) collect(path.join(dir, name));
      else if (!name.startsWith('[') && !name.startsWith('_')) routes.add(name);
    }
  };
  collect(appDir);

  const bad = new Set();
  for (const file of walk('client/src')) {
    const src = read(file);
    /*
     * Matches both `href="/x"` and `href={`/x/${slug}`}`. The first version of
     * this only matched the braced form, so it sailed past the footer's plain
     * `href="/privacy"` — a dangling link, in the check written to find
     * dangling links. Hence the two alternatives spelled out.
     */
    for (const m of src.matchAll(/href=(?:"|'|\{\s*[`"'])\/([a-z0-9-]+)/gi)) {
      const segment = m[1];
      if (segment && !routes.has(segment)) bad.add(`/${segment}`);
    }
  }

  // `/admin` lives outside the storefront group and is matched above; anything
  // left is a genuine dangling link.
  return bad.size === 0 || `links to non-existent routes: ${[...bad].join(', ')}`;
});

check('Admin report types match the server enum', () => {
  /*
   * The reports screen asked for `type=sales` by default long after the server
   * had dropped it, so the page 422'd on open and nobody noticed — the client
   * declares its own union and `tsc` has nothing to compare it against.
   * Compare the two literally.
   */
  const server = code('server/src/validators/admin.ops.validators.ts');
  const client = code('client/src/app/admin/reports/page.tsx');

  const enumMatch = /type: z\.enum\(\[([^\]]+)\]\)/.exec(server);
  if (!enumMatch) return 'reportQuerySchema type enum not found';

  const allowed = [...enumMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  // Bound to the TYPES array so an unrelated `value:` elsewhere cannot join in.
  const typesBlock = /const TYPES:[\s\S]*?\n\];/.exec(client);
  if (!typesBlock) return 'TYPES array not found in the reports page';

  const asked = [...typesBlock[0].matchAll(/value: '([^']+)'/g)].map((m) => m[1]).sort();

  if (asked.length === 0) return 'no report types found in the client';

  const unknown = asked.filter((t) => !allowed.includes(t));
  return unknown.length === 0 || `client asks for report types the server rejects: ${unknown.join(', ')}`;
});

check('Server and client agree on the overdue threshold', () => {
  /*
   * The dashboard card counts overdue leads; the list paints those rows red.
   * They are computed in two places — one has to be, because the Sunday rule
   * cannot be written as a Mongo aggregation without `$function`. So assert
   * the two constants match rather than trusting a comment.
   */
  const server = code('server/src/services/dashboard.pipeline.ts');
  const client = code('client/src/components/admin/inquiries/overdue.ts');

  const grab = (src) => /OVERDUE_AFTER_HOURS = (\d+)/.exec(src)?.[1];
  const a = grab(server);
  const b = grab(client);

  if (!a || !b) return 'OVERDUE_AFTER_HOURS not found in both files';
  if (a !== b) return `server says ${a}h, client says ${b}h`;

  // Both must skip Sunday, or the counts diverge every Monday.
  const skips = (src) => /getDay\(\) === 0/.test(src);
  return (skips(server) && skips(client)) || 'one side does not exclude Sunday';
});

check('The overdue rule excludes closed days', () => {
  // "24 hours old" would mark every Saturday-evening inquiry overdue on
  // Sunday, when the counter was shut and nobody could have answered.
  const src = code('client/src/components/admin/inquiries/overdue.ts');
  return /getDay\(\) === 0/.test(src) || 'nothing excludes Sunday from the elapsed time';
});

/* ------------------------------ 7. Hygiene ------------------------------- */

check('Mirrored type files are byte-identical (server-side pair)', () => {
  // The leading doc-comment names the *other* copy, so it is expected to
  // differ; everything below it must be identical.
  const body = (s) => s.slice(s.indexOf('*/') + 2);
  /*
   * `catalog.types.ts` and `user.types.ts` are compared again — they were
   * excluded while the client still described the pre-pivot shape, and that
   * debt is now repaid.
   *
   * `api.ts` stays out: the client copy adds `HttpMethod`, which is a fetch
   * concern with no server counterpart. The shared envelope above it is
   * identical, and that is the part that matters.
   */
  const files = ['catalog.types.ts', 'content.types.ts', 'inquiry.types.ts', 'user.types.ts'];
  const drift = files.filter(
    (f) => body(read(`client/src/types/${f}`)) !== body(read(`server/src/types/${f}`)),
  );
  return drift.length === 0 || `drifted: ${drift.join(', ')}`;
});

check('No file exceeds 300 lines', () => {
  const over = walk('client/src').concat(walk('server/src'))
    .map((f) => [f, read(f).split('\n').length]).filter(([, n]) => n > 300);
  return over.length === 0 || over.map(([f, n]) => `${f} (${n})`).join(', ');
});

check('No `any` in either workspace', () => {
  const bad = [];
  for (const f of walk('client/src').concat(walk('server/src'))) {
    const s = read(f);
    s.split('\n').forEach((line, i) => {
      if (/[:<]\s*any\b/.test(line) && !/eslint-disable/.test(line)) bad.push(`${f}:${i + 1}`);
    });
  }
  return bad.length === 0 || bad.join(', ');
});

/* -------------------------------- Report --------------------------------- */

let pass = 0;
for (const [ok, name, detail] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        → ${detail}`}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${results.length} checks passed`);
process.exit(pass === results.length ? 0 : 1);
