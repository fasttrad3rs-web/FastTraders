# Phase 7B — Quote builder and the remaining admin screens

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

17 files, 13 new routes. **The admin is complete at 19 routes.**

| Route | What it does |
| --- | --- |
| `/admin/quotations` · `/[id]` | Pipeline table and the quote builder |
| `/admin/categories` | Three-level tree, drag-to-reorder within a parent |
| `/admin/brands` · `/banners` · `/coupons` | CRUD with drawer forms |
| `/admin/customers` | Table with detail drawer, order history and LTV |
| `/admin/reviews` | Moderation queue |
| `/admin/contacts` | Inbox-style enquiries |
| `/admin/newsletter` | Subscribers with CSV export |
| `/admin/reports` | Sales / inventory / customer, JSON + CSV + XLSX |
| `/admin/settings` | Store, shipping zones, payments, announcement |
| `/admin/audit-logs` | Activity feed with before/after diffs |

---

## The quote builder

This is the screen the RFQ half of the business runs on.

Per-line unit price inputs, with line totals, subtotal, tax and grand total
recalculating as Sharjeel types. **The figures shown are a preview.** What gets
saved is recomputed server-side from the unit prices — the panel says so in
plain text — so a stale browser tab can never persist a wrong total.

Guards that matter:

- **Send is disabled until every line is priced.** A half-priced quotation going
  out to a customer is worse than a slow one.
- **Convert is gated on `accepted`.** While the quote is still `quoted` the
  button is disabled and a line of text explains why, rather than leaving the
  admin guessing.
- **An already-converted quote relabels to "Already converted" and disables** —
  the API returns 409 on a second attempt, but the UI shouldn't invite it.
- The conversion dialog states that the order uses the *quoted* prices, not
  current catalogue prices, because the customer accepted those figures.

Customer notes appear inline next to the line they belong to, which is where
the "3P, 36 kA, needed by the 20th" context actually needs to be.

---

## One generic CRUD screen, four resources

Brands, banners and coupons expose the same shape on the API, so they share
`ResourceScreen` — a declarative field list drives a right-hand drawer form.
Anything genuinely bespoke is passed in as `renderRow`: the banner row draws a
live thumbnail with the headline over it, the coupon row computes its own
Live / Expired / Limit-reached badges.

Categories needed their own screen — a flat API list assembled into a tree,
with expand/collapse and drag-to-reorder. **Reorder posts one bulk call**, not
a write per row, and refuses a cross-parent drop with a toast rather than
silently producing a nonsense hierarchy.

The delete dialog says what will happen: *"the API refuses if it still has
sub-categories or products, and tells you how many"* — which is exactly what
the Phase 4 guard does.

---

## Settings

Four tabs: store details, shipping and tax, payments, announcement.

The shipping zone editor carries an explicit note that rules match top to
bottom with `*` as the fallback — that ordering is load-bearing for what a
customer gets charged, and it isn't obvious from the form.

The announcement tab renders a live preview of the cyan bar, and the payments
tab states plainly that JazzCash and Easypaisa are wired but not contracted.

---

## Verification

`tsc --noEmit` strict and `next lint` clean. No file over 300 lines — the
category page hit 306 and its drawer moved to `components/admin/crud/`.

A 12-check harness on the quote builder and CRUD surface:

- a priced line shows its total, an unpriced one shows "—" not "Rs. 0"
- subtotal, 18% tax and grand total computed correctly from unit prices
- the totals block is labelled a preview
- send disabled while partly priced, enabled when complete
- convert disabled while `quoted`, enabled when `accepted`, disabled again once `converted`
- the loading state shows a skeleton rather than claiming "no records"

12/12, and the 7A harness still passes 17/17.

**Two harness bugs I fixed rather than papered over.** My first assertion for
"is this button disabled" matched Tailwind's `disabled:opacity-50` class rather
than the attribute, so it reported failures on buttons that were correctly
enabled. And I initially asserted on drawer contents that `renderToStaticMarkup`
can never see, because Radix renders them through a portal. Both assertions
were wrong, not the code — but a test that passes for the wrong reason is worse
than no test, so they're now checking the real thing.

---

## Where the project stands

| Phase | Delivered |
| --- | --- |
| 1–2 | Monorepo, 15 models, seed data |
| 3–4 | 120 API routes (53 public, 67 admin) |
| 5 | Design system, 19 UI modules |
| 6A/6B | 33 storefront routes, full SEO layer |
| 7A/7B | 19 admin routes |

178 client files, 144 server files. Strict TypeScript throughout, no file over
300 lines, ~100 verification checks passing across seven harnesses.

**Still outstanding, in the order I'd worry about them:**

1. **No code has ever run against a real MongoDB.** The sandbox blocks the
   mongod download. Everything past the validation layer is typechecked and
   unit-tested but never integration-tested. Seed against Atlas and smoke-test
   before anything else.
2. `next build` and Lighthouse unmeasured — `next build` SIGBUSes here even for
   a two-file app, so it's environmental, but it needs running locally.
3. No automated test suite. The harnesses are throwaway scripts, not something
   that runs in CI.
4. Live Stripe integration, deployment config, and the smaller pre-launch items
   in `PHASE-6B.md` (lawyer review of policies, product photography,
   attributable testimonials, exact GPS pin).
