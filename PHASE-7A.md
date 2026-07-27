# Phase 7A — Admin shell, dashboard, products, orders

23 files. Six admin routes live; the remaining thirteen land in 7B.

| Route | What it does |
| --- | --- |
| `/admin` | Six KPI cards, four charts with a range picker, low-stock panel, recent activity |
| `/admin/products` | Table with search, five filters, sort, selection, bulk actions, import/export |
| `/admin/products/new` · `/[id]/edit` | Seven-tab form with live preview |
| `/admin/orders` | Status tabs, search, filtered revenue total |
| `/admin/orders/[id]` | Full detail plus the admin action rail |

---

## A structural change: route groups

The admin was going to inherit the storefront header, footer and WhatsApp
bubble. I restructured `app/` into route groups:

```
app/
  layout.tsx            html + body + providers only
  (storefront)/
    layout.tsx          announcement · header · footer · WhatsApp · bottom nav
    …all 33 public routes
  admin/
    layout.tsx          AdminShell — sidebar + topbar
```

`not-found.tsx` stays at the root (it catches genuinely unmatched URLs) and
brings its own chrome. The Phase 6A harness still passes 14/14 after the move,
so nothing regressed.

---

## Middleware is a UX gate, not the security boundary

`middleware.ts` decodes the access-token cookie and redirects anyone who isn't
`admin` or `manager` to `/login?next=…`.

**It does not verify the signature.** The Edge runtime has no access to
`JWT_ACCESS_SECRET`, so it checks structure, expiry and role claim only. A
forged cookie gets past the redirect and then hits a wall: every admin endpoint
independently enforces `protect + restrictTo`, so the screen renders empty and
every request 403s. The comment in the file says this explicitly, because it's
the kind of thing that gets mistaken for real auth later.

It also sets `Cache-Control: no-store` and `X-Robots-Tag: noindex` on every
admin response.

---

## Dashboard

Six KPI cards, four Recharts visualisations (revenue line with a 7/30/90/365-day
picker, orders donut, top products, revenue by brand and category), a low-stock
panel and recent orders/quotations.

**On the percentage changes:** the API returns cumulative figures, not
period-over-period deltas. Today is compared against the daily average of the
month so far, and this month against the monthly average of the year. That's an
indicative trend, not an exact comparison, and each card labels it *"vs previous
period"* rather than implying precision. A true comparison needs a second
aggregation on the server — worth adding if Sharjeel starts making decisions on
these numbers.

`invertChange` handles metrics where up is bad: out-of-stock rising 22% shows
red with an up arrow, rather than green.

---

## Products

The table has an inline status `Switch` per row, colour-coded stock, five
filters, bulk activate/deactivate/feature/unfeature, and export that links
straight at the API's streaming endpoint with the current filters applied.

Deactivation is a **soft delete** and the confirmation dialog says so — "order
history and links keep working" — because "Delete" on a product a customer
bought is a genuinely alarming button.

**The seven-tab form:** Basic · Pricing & stock · Images · Specifications ·
Variants · Datasheets · SEO, with a live preview column showing the product card
as a shopper sees it. That's the fastest way to catch a wrong pricing mode
before saving.

Two deliberate behaviours:

- **Auto-slug never overwrites an existing product's slug.** Renaming a product
  in the admin shouldn't silently break inbound links and search rankings.
- **The Images tab is disabled until the product exists.** Uploads post to
  `/admin/products/:id/images` and there's no id yet on the create form. The tab
  explains that rather than failing silently.

The SEO tab renders a Google preview from the live field values.

---

## Orders

Status filter tabs, search across number/customer/phone/tracking, and a
filtered-revenue figure in the header so it matches the table below it.

The detail page **reuses the customer-facing `OrderDetail` component** for the
read-only half. One presentation of an order means the admin and the customer
can never be looking at different numbers.

The action rail covers status change (with note and an opt-out email toggle),
dispatch, payment status, PDF invoice and a mailto. Moving to `cancelled` or
`returned` triggers a confirmation dialog explaining that stock returns to
inventory.

---

## Verification

`tsc --noEmit` strict and `next lint` clean, no file over 300 lines.

A 17-check harness covered the parts worth proving:

- **Middleware**: no cookie, customer role, expired token and a malformed
  string all redirect; admin and manager pass through with both security
  headers set. The malformed case matters — a garbage cookie must not throw.
- **Shell**: all 15 destinations render in five groups; collapsing hides labels
  but keeps the links.
- **Dashboard**: PKR values, change direction, `invertChange` correctly showing
  red for a rise in out-of-stock, skeletons rather than zeros while loading,
  and an unpriced quotation showing "—" rather than "Rs. 0".
- **Order actions**: all seven statuses, the no-op button disabled, the current
  payment status disabled.
- **Product form**: slug generation across symbols/accents/empty input, payload
  mapping of CSV fields to arrays, and retail-without-a-price failing validation
  with the error attached to the `price` field.

17/17 pass, and the Phase 6A storefront harness still passes 14/14 after the
route-group restructure.

Unmeasured, as before: `next build` (SIGBUS in this sandbox) and Lighthouse.

---

## Next: Phase 7B

The quote builder (`/admin/quotations/[id]` — per-item pricing, validity, PDF
preview, send, convert to order), categories tree, brands, customers, reviews
queue, banners, coupons, contacts inbox, newsletter, reports and settings.
