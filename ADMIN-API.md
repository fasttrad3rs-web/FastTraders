# Fast Traders — Admin API (Phase 4)

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

**67 routes** under `/api/v1/admin`, all behind one guard:

```ts
router.use(protect, restrictTo('admin', 'manager'));
```

Anonymous → `401`. A `customer` token → `403`. A handful of destructive
operations narrow further to `admin` only, marked **[admin]** below.

Same envelope as everywhere else: `{ success, message, data }`.

---

## Dashboard

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/dashboard/stats` | Revenue for today / week / month / year, orders by status, payments by status, RFQ counts, low-stock and out-of-stock counts, new customers, AOV, quotation conversion %, checkout conversion %, pending reviews and enquiries |
| GET | `/dashboard/charts?granularity=daily\|weekly\|monthly&days=30` | Sales over time, top 10 products, revenue by category, revenue by brand |
| GET | `/dashboard/recent` | Latest 10 orders, quotations, reviews and contacts |

Revenue everywhere excludes `cancelled` and `returned` orders, so the figures
match what is actually in the till. The week starts Monday — the Lahore working
week runs Mon–Sat.

---

## Products

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products` | `search` (name/SKU/part number), `category`, `brand`, `pricingMode`, `isActive`, `lowStock`, `outOfStock`, `tags`, 8 sort options. **Includes `costPrice`** |
| POST | `/products` | Slug auto-generated from the name with collision handling |
| GET·PATCH | `/products/:id` | Partial update; renaming regenerates the slug |
| DELETE | `/products/:id` | **Soft delete** (`isActive = false`) — order lines and links keep resolving |
| POST | `/products/bulk` | `activate` · `deactivate` · `delete` · `feature` · `unfeature` · `price_adjust` |
| POST | `/products/import` | CSV/XLSX, `?dryRun=true` for a preview |
| GET | `/products/export?format=csv\|xlsx` | Column names match the importer exactly |
| PATCH | `/products/:id/stock` | Audited adjustment, **reason required** |
| POST | `/products/:id/images` | Multi-upload to Cloudinary (`images` field) |
| DELETE | `/products/:id/images/:publicId` | URL-encode the public id |

**`costPrice` is the one field that crosses the public/admin line.** It is
`select: false` on the model, so admin queries opt in with `.select('+costPrice')`
and every public projection excludes it by construction.

**Bulk price adjustment** takes `{ type: 'percent'|'fixed', value, field, roundTo }`.
A negative value reduces. `roundTo: 50` snaps to the nearest Rs. 50 — useful
after a rupee devaluation. Results floor at zero, never negative.

**Import** validates each row independently and returns a report:

```jsonc
{ "totalRows": 120, "created": 96, "updated": 18, "skipped": 6, "dryRun": false,
  "issues": [{ "row": 14, "sku": "SCH-X1", "errors": ["brandSlug: \"schnieder\" not found"] }],
  "recognisedColumns": ["sku", "name", "categorySlug", …] }
```

A bad row is named and skipped — never silently dropped, never aborting the
rows around it. Numeric cells tolerate `"1,250"` and `"Rs. 1250"` from
hand-edited sheets; booleans accept `yes/y/true/1`. Because export columns
match import columns, the workflow is: export → edit in Excel → dry-run
import → commit.

---

## Categories · Brands · Banners · Coupons

All four expose the identical surface, generated from one CRUD factory:

| Method | Path |
| --- | --- |
| GET | `/{resource}` — `search`, `isActive`, `parent`, `position` |
| POST | `/{resource}` |
| GET·PATCH·DELETE | `/{resource}/:id` |
| PATCH | `/{resource}/reorder` — `{ items: [{ id, displayOrder }] }` |

Reorder is one `bulkWrite` regardless of how many rows were dragged.

**Delete guards:** a category with children or products returns `409` naming
the count; a brand still on products does the same. Nothing is orphaned by
accident.

---

## Orders

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/orders` | `search` (number/customer/phone/tracking), `status`, `paymentStatus`, `paymentMethod`, `from`, `to`, 4 sorts. Also returns `filteredRevenue` so the header figure matches the table |
| GET | `/orders/:id` | Populated user and status history |
| PATCH | `/orders/:id/status` | `{ status, note?, notifyCustomer=true }` → customer email |
| PATCH | `/orders/:id/payment` | Marking `paid` auto-confirms a pending order |
| PATCH | `/orders/:id/tracking` | `markShipped: true` also moves status and emails the customer |
| GET | `/orders/:id/invoice` | **PDF invoice** (see below) |
| GET | `/orders/export?format=` | CSV/XLSX honouring the same filters |

Moving an order to `cancelled` or `returned` **releases the reserved stock**
back to the shelf — and only on the transition, so a double-cancel cannot
inflate inventory.

---

## Quotations

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/quotations` | `status`, `assignedTo`, `unassigned`, date range. Sweeps lapsed `validUntil` to `expired` on each load |
| GET | `/quotations/:id` | |
| PATCH | `/quotations/:id` | Per-line prices, tax, validity, notes |
| GET | `/quotations/:id/pdf` | Formal quotation PDF |
| POST | `/quotations/:id/send` | Emails the PDF as an attachment; refuses if any line is unpriced |
| POST | `/quotations/:id/convert` | Accepted quotation → Order |
| PATCH | `/quotations/:id/assign` | Assigning a `new` RFQ moves it to `reviewing` |

**Pricing matches lines on SKU, not array index** — a reordered payload cannot
silently price the wrong item, and an unknown SKU returns `400` naming it.

**Conversion uses the quoted prices, not the live catalogue.** The customer
accepted those figures and they must not move underneath them. Conversion is
refused unless the status is `accepted` and every line carries a price, and it
is idempotent — a second attempt returns `409`.

---

## Customers

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users` | `search`, `role`, `isActive`, 4 sorts. Order count and lifetime value come from a single aggregation for the whole page, not N queries |
| GET | `/users/:id` | Profile + order history + RFQs + reviews + lifetime metrics (orders, value, AOV, first/last order) |
| PATCH | `/users/:id/role` | **[admin]** Revokes all their sessions — the role is baked into the access token |
| PATCH | `/users/:id/status` | **[admin]** Deactivating signs them out everywhere |

Both refuse to act on your own account, so an admin cannot lock themselves out.

---

## Content & ops

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/reviews?includePending=true` | Moderation queue |
| PATCH | `/reviews/:id/approval` | Recomputes the product's rating |
| DELETE | `/reviews/:id` | |
| GET | `/settings` | Includes `bankDetails` (withheld from the public endpoint) |
| PATCH | `/settings` | **[admin]** Upsert, so it works on a fresh database |
| GET | `/contacts` | `status`, `search`, plus an `unread` count |
| PATCH | `/contacts/:id` | `responded` stamps `respondedAt` |
| GET | `/newsletter` · `/newsletter/export` | |
| GET | `/audit-logs` | `entity`, `entityId`, `actor`, `action`, date range |
| GET | `/reports?type=sales\|inventory\|customer&format=json\|csv\|xlsx` | |

**Reports.** `sales` is order-level with totals and AOV; `inventory` includes
`costPrice` and computed stock value; `customer` gives lifetime value, repeat
buyers and last-order dates. XLSX exports get a **Summary** sheet alongside the
**Detail** rows.

---

## PDF documents

Generated with **pdfkit** — no headless browser, so it runs fine on Railway's
smallest instance and adds ~50 ms rather than ~2 s per document.

Both documents share one letterhead builder, so they cannot drift apart:

- Navy band with the cyan keyline, `FAST TRADERS`, the tagline, and the full
  business card — Shop No. 30, Grace Tower, Bull Road, Lahore · mobile ·
  landline · email · website.
- Two-column meta panel (Bill To / Invoice details).
- Zebra-striped item table with SKU sub-labels, repeating its header across
  page breaks.
- Right-aligned totals with the grand total in a navy band.
- **Amount in words** using South Asian numbering — `Rs. 514,283` renders as
  *"Five Lakh Fourteen Thousand Two Hundred Eighty Three Rupees Only"*, which
  Pakistani invoices are expected to carry.
- Terms, bank details from Settings, and a footer with `Page n of m`.

The quotation adds a signature block (For Fast Traders / Customer acceptance)
and, when unpriced, prints an "on request" notice instead of a totals block.

---

## Audit trail

Every admin mutation writes `{ actor, action, entity, entityId, before, after, ip }`.
`passwordHash`, `refreshTokens`, reset/verify tokens and `costPrice` are
redacted from snapshots. Writes are fire-and-forget — an audit failure logs
loudly but never breaks the operation it records.

Covered: product create/update/delete/bulk/stock/images/import, all four
taxonomy CRUD surfaces plus reorder, order status/payment/tracking, quotation
pricing/send/assign/convert, user role and status, settings, contact status,
review moderation.
