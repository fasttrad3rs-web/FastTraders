# Pre-production audit — Fast Traders

**Date:** 29 July 2026 · **revised 30 July** after the developer-side work below
**State:** running locally; nothing deployed
**Green right now:** 164 tests / 13 suites, 77/77 catalogue-pivot checks, commerce audit clean, TypeScript and ESLint clean across both workspaces.

> **Revision note.** Sections 1.2, 1.4, 1.5 and 6 are now DONE, plus compression,
> deploy configs and the handover docs. Two bugs found while doing that work are
> recorded in §7. One claim in the original audit was wrong: the OG image *was*
> already wired up — see §7.

The build is healthy. What follows is what stands between "works on your machine" and "safe to hand to Sharjeel".

---

## 1. Blockers — do not go live without these

### 1.1 Rotate the credentials that were pasted into chat

The **Cloudinary API secret** and the **MongoDB Atlas password** were both shared in conversation. Treat them as public. Rotate both before either becomes a production credential — not after.

While you are there: production accounts (Atlas, Cloudinary, Railway, Vercel) should be created on **fasttrad3rs@gmail.com** with you invited as a collaborator. If they are created on your account, Sharjeel cannot recover his own business when you are not reachable.

### 1.2 The admin panel is still half-commerce

STEP 8 was sequenced as "cockpit + list first", and the rest was never picked up. Three screens still describe a shop that takes money:

| Screen | What is still there |
|---|---|
| `/admin/settings` | A **"Shipping & tax"** tab, and `shippingRules` is read and written on save |
| `/admin/reports` | A **Sales** report offering "Order-level revenue, tax, discount and delivery"; `MONEY_KEYS` still formats `revenue`, `averageOrderValue`, `totalDiscount` |
| `/admin/dashboard` | Never rewired to the STEP 8 KPIs — no overdue count, no pending follow-ups, no by-city or by-brand, no "top requested but not in catalogue" |
| `/admin/products` | Table and form never reworked for the catalogue-only model |

The public site is clean — the commerce audit confirms that every run. This is admin-side only. But Sharjeel opening Reports and finding a Sales tab that returns nothing is the moment he stops trusting the tool.

### 1.3 Every product is demo data

All **50 seeded SKUs** are invented, and **not one has a real image** — every `images` entry points at a local placeholder SVG. There are zero Cloudinary URLs in the seed.

A catalogue site whose entire catalogue is fictional cannot launch. Decide which of these you are doing:

- replace the seed with Sharjeel's real stock list before launch, or
- launch with a much smaller set of genuinely stocked items, or
- mark the demo set clearly and keep the site `noindex` until it is replaced.

Whichever way, product photography is now on the critical path and it is not a coding task.

### 1.4 Missing error and identity assets

- **No `error.tsx` and no `global-error.tsx`.** A runtime error in a client component currently shows Next.js's unstyled default. `not-found.tsx` exists; its siblings do not.
- **No `favicon.ico`** — `icon.png` and `apple-icon.png` exist, but older browsers and most link-preview scrapers look for `favicon.ico`.
- **No OG image.** Every WhatsApp share of this site — which for this audience is *the* sharing channel — will render as a bare grey link.

### 1.5 Three pages exist but nothing links to them

`/faq`, `/privacy-policy` and `/shipping-returns` are built, routed, and orphaned. Only `/terms` is linked from the footer.

The privacy policy matters beyond tidiness: Google Business Profile and Search Console both expect a reachable one, and it is the page a B2B buyer looks for before handing over a phone number.

---

## 2. Not built — STEP 9, beyond the security slice

The security half of STEP 9 is done and verified. The rest was never started.

**Testing**

- No frontend tests of any kind. Vitest, Testing Library — neither is installed. `inquiryStore` add/remove/persist, form validation, the WhatsApp message builder's encoding, and availability badge mapping are all untested.
- No Playwright. None of the four end-to-end journeys are covered, including "assert no rupee symbol renders anywhere on the public site" — which is the one that would catch a price leak the API tests cannot see, because it checks what is *rendered*, not what is *sent*.
- No `mongodb-memory-server`. The backend suites stub Mongoose, so no test has ever exercised a real query, a real index, or a real unique constraint.

**Performance** — none of it done.

- No `compression` middleware on the API at all.
- No caching layer for categories/brands/settings/featured.
- No `explain()` run against the product listing query; the indexes look sensible but have never been measured.
- No bundle analyzer pass, no dynamic import for the admin charts or editor, no Lighthouse run.

For an audience on Pakistani mobile data this is the gap most likely to cost real enquiries, and it is entirely unmeasured. The 3G Lighthouse 90+ target is currently unknown, not failed.

**Accessibility** — none of it done. No axe pass, no keyboard-only run through the forms, no focus-trap check, no `aria-live` on inquiry-list updates, no contrast verification of navy/cyan.

---

## 3. Not built — STEP 10

**Nothing in STEP 10 exists except the CI workflow.**

- No `vercel.json`, no `railway.json`.
- No Sentry on either app.
- `ADMIN_GUIDE.md` and `MAINTENANCE.md` do not exist. These are the two documents Sharjeel and his staff actually need; the API docs are for you.
- `README.md` and `API.md` exist but predate the catalogue pivot, the inquiry rename and the whole security slice. Assume they are wrong until reviewed.
- No uptime monitoring.

Everything external is untouched and is yours to do, not mine: Atlas cluster and backups, Railway, Vercel and the domain, production Cloudinary, Google Business Profile, Search Console, Bing, WhatsApp Business, directory listings.

The GitHub Actions workflow is written and parses, but **has never run** — there is no `.github` history because nothing has been pushed.

---

## 4. Needs your hands — cannot be verified from here

These are not defects. They are checks only you can perform, on your machine or on a real phone.

1. **Run the bundle scan for real.** `npm run build:client && npm run verify:bundle`. I verified the scanner against a synthetic fixture in both directions, but never against a real Next.js build — the sandbox is linux/arm64 and your SWC binary is macOS.

2. **Email deliverability is completely unproven.** Everything so far has gone through Mailtrap, which is a capture-only sandbox that delivers to nobody. SPF and DKIM for `fasttrad3rs@gmail.com` have never been exercised. Until a real inquiry lands in that inbox and *not* in spam, assume the notification path does not work.

3. **The negative upload test** from SETUP.md §12.3: submit `/source-from-china` with a `.txt` renamed to `photo.jpg`. Expect "2 received" and that file listed as unreadable. The magic-byte validation is unit-tested; this proves it end to end.

4. **Click-to-call and WhatsApp prefill on a real Android phone.** Emulators lie about both. This is the primary conversion path for the entire site.

5. **A full pass on mobile data,** not office wifi.

---

## 5. Known-but-unfixed

Small, flagged earlier, deliberately not fixed:

- **`mobileImage` on banners is never rendered.** The admin form collects it and the seed sets it, but the hero is `hidden … lg:block`, so on mobile no banner shows at all and the field is dead weight.
- **The `strip` banner position is seeded but never fetched.** A banner set to "Promotional strip" in the admin will silently never appear.

Both are admin features that appear to work and do nothing — worth fixing before Sharjeel discovers them himself.

---

## 7. Done since this audit was written

**Admin commerce surfaces removed (was §1.2)**

- `/admin/settings` — the Shipping & tax tab is gone, along with `shippingRules`
  and `defaultTaxRate` through the model, types, validator and seed.
- `/admin/reports` — rebuilt around Inquiries / Stock & demand / Customers.
- Dashboard — added Overdue, Follow-ups due, Inquiries by city, and
  "Asked for but not stocked".
- `/admin/products` — **still outstanding**, the one piece of §1.2 not done.

**Two bugs found while doing it**

1. **The reports page was broken, not just mislabelled.** The server dropped the
   `sales` report type during the pivot, but the client still asked for it *by
   default* — so opening Reports sent `type=sales` and got a 422 straight back.
   It had been broken since the pivot. Nothing typed the client against the
   server enum, so nothing caught it.

2. **Every category link on the site pointed at a route that does not exist.**
   The mega-menu, mobile nav, footer and 404 page all linked to
   `/category/<slug>`; the route is `/categories/[slug]`. The entire primary
   navigation 404'd. Next.js resolves hrefs at runtime, so nothing failed to
   compile and nothing failed to build. Also found: a `/privacy` link where the
   page is `/privacy-policy`, and a "My profile" item in the admin menu pointing
   at `/account/profile`, a leftover from the deleted customer account area.

   Both classes are now harness checks — one comparing the client's report types
   against the server enum, one resolving every internal href against the actual
   route directories. The link checker initially missed `/privacy` because its
   regex only matched `href={...}` and not plain `href="/x"`; that is fixed, and
   finding it was what surfaced the `/account` leftover.

**Polish (was §1.4, §1.5)**

- `global-error.tsx` — fully inline, so it still renders if the layout is what
  threw, with the phone number hard-coded for the same reason.
- `admin/error.tsx` — shows the error digest, because "it broke" down the phone
  is not debuggable.
- `favicon.ico` generated at 16/32/48px.
- Footer now links FAQ, Delivery & returns and Privacy.

**Dead features fixed (was §5)**

- Hero banners now render `mobileImage` on phones, when one is supplied.
- The `strip` banner position is fetched and rendered — it was saveable in the
  admin and silently invisible.

**Also added**

- `compression` on the API, gzip above 1 KB.
- `railway.json` and `vercel.json` (Vercel region `bom1` — Mumbai, closest to
  Lahore). `vercel.json` also 301s `/category/:slug` → `/categories/:slug` so
  any link already in the wild survives.
- `ADMIN_GUIDE.md` and `MAINTENANCE.md`.
- `npm run create-admin` — create, reset, unlock or deactivate a staff account.
  Deactivating also clears refresh tokens, which is the step people forget.

**One correction to this audit.** It claimed there was no OG image. There is:
`public/brand/og-default.png`, wired through `src/lib/seo/index.ts`. I checked
the wrong path first and reported it as missing.

---

## 8. Suggested order

1. **Rotate credentials** — still outstanding, still first
2. **Real product data and photography** — the long pole, needs Sharjeel
3. `/admin/products` table and form — the last of §1.2
4. Sentry on both apps
5. Performance and accessibility passes
6. Frontend and E2E tests
7. External accounts and local SEO
8. The manual checklist in §4

Items 3–6 are mine. Item 2 needs Sharjeel. Item 7 and all of §4 are yours.
