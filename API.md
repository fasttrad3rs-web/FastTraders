# Fast Traders — REST API (Phase 3)

Base URL: `/api/v1` · 53 routes · every response uses the same envelope.

```jsonc
{ "success": true,  "message": "…", "data": { … } }
{ "success": false, "message": "…", "data": null, "errors": [{ "field": "email", "message": "…" }] }
```

`errors[]` appears only on validation failures. `stack` is added in
development and never in production.

---

## Authentication model

| Token | Lifetime | Transport |
| --- | --- | --- |
| Access | 15 m (`ACCESS_EXPIRY`) | JSON body **and** `ft_access_token` httpOnly cookie |
| Refresh | 7 d (`REFRESH_EXPIRY`) | `ft_refresh_token` httpOnly cookie only |

The access token is returned both ways on purpose: browser clients ride on the
cookie (nothing for XSS to steal), while native clients can use the JSON value
as `Authorization: Bearer …`.

**Rotation with reuse detection.** Refresh tokens are stored as SHA-256 hashes,
max 5 per account. Each `/auth/refresh` consumes the presented hash and issues
a fresh pair. A structurally valid token whose hash is *not* on file means it
was already rotated — i.e. stolen and replayed — so every session on the
account is revoked immediately.

Roles: `customer` · `manager` · `admin`.

---

## Auth — `/auth`

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | 5/15 min | Sends welcome + verification email, signs the user in, merges their guest carts |
| POST | `/auth/login` | 5/15 min | Merges guest carts, retires the session cookie |
| POST | `/auth/refresh` | — | Rotates the pair |
| POST | `/auth/logout` | — | Idempotent; revokes just this device |
| POST | `/auth/forgot-password` | 3/hour | **Always** 200 — never reveals whether an address is registered |
| POST | `/auth/reset-password/:token` | 5/15 min | 30-minute one-time token; revokes all sessions, then signs in |
| POST | `/auth/verify-email/:token` | — | 24-hour one-time token |
| GET | `/auth/me` | auth | |
| PATCH | `/auth/me` | auth | name, phone, companyName, ntn |
| PATCH | `/auth/me/password` | auth | Signs out every other device |
| POST | `/auth/me/resend-verification` | auth, 3/hour | |
| GET·POST | `/auth/me/addresses` | auth | Max 8; exactly one default enforced by the model |
| PATCH·DELETE | `/auth/me/addresses/:index` | auth | Index into the address array |

The rate limiter is **per IP across all credential routes** and uses
`skipSuccessfulRequests`, so a user who logs in first time never burns quota.

---

## Catalogue

### `GET /products`

| Param | Type | Notes |
| --- | --- | --- |
| `page` `limit` | int | default 1 / 24, limit ≤ 100 |
| `sort` | enum | `newest` · `price_asc` · `price_desc` · `popular` · `name` |
| `category` | slug | Matches the category **and its whole subtree** |
| `brand` | csv slugs | `schneider-electric,terasaki` |
| `minPrice` `maxPrice` | number | 422 if min > max |
| `inStock` | bool | |
| `pricingMode` | enum | `retail` · `quote` · `both` |
| `isFeatured` | bool | |
| `tags` | csv | ANDed |
| `search` | string | Weighted text index: sku 20, partNumber 20, name 10, tags 5, description 1 |
| `specs` | `Key:Value\|Key:Value` | e.g. `Poles:3P\|Rated Current:250 A` |

Returns `{ items, meta, facets }`.

```jsonc
"meta":   { "page": 1, "limit": 24, "total": 52, "totalPages": 3, "hasNext": true, "hasPrev": false }
"facets": { "brands": [{ "value": "terasaki", "label": "Terasaki", "count": 3 }],
            "categories": […], "pricingModes": […], "stockStatus": […],
            "specs": [{ "key": "Poles", "values": […] }],
            "priceRange": { "min": 195, "max": 118000 } }
```

Each facet is computed with **its own dimension removed** from the filter —
otherwise picking "Schneider" would collapse the brand list to one entry and
the shopper could never widen the selection again.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/products/:slug` | Detail + related (same subcategory → category → brand); bumps `viewCount` without blocking |
| GET | `/products/:id/similar` | `?limit=` (≤ 24) |
| GET | `/categories` | Nested tree with rolled-up product counts; `?includeEmpty=` `?featuredOnly=` |
| GET | `/categories/:slug` | Category + breadcrumbs + children |
| GET | `/brands` | `?featuredOnly=` `?withCounts=` |
| GET | `/search/suggest?q=` | Prefix-matches SKU and part number first, then name (min 2 chars) |

**`costPrice` is `select: false` on the model and absent from every projection
in this layer.** It is also missing from the client-side `Product` type, so
leaking it would be a compile error.

---

## Dual carts

Identical shapes, different collections-by-discriminator and different rules:

| Cart | Path | Accepts `pricingMode` | Leads to |
| --- | --- | --- | --- |
| Shopping | `/cart/items` | `retail`, `both` | Order |
| Inquiry | `/inquiry/items` | `quote`, `both` | Quotation |

| Method | Path |
| --- | --- |
| GET | `/cart` · `/cart/items` |
| POST | `/cart/items` — `{ product, qty, variant?, note? }` |
| PATCH | `/cart/items/:productId?variant=` — `{ qty?, note? }` |
| DELETE | `/cart/items/:productId?variant=` |
| DELETE | `/cart/items` — empty the cart |

Guests are tracked with an opaque httpOnly `ft_session_id` cookie (30-day TTL
matching the Cart model). On login or registration both guest carts are merged
into the account — quantities summed for products present in both — and the
cookie is cleared. A merge failure logs but never blocks sign-in.

The response is a hydrated summary, priced from the **live** product record:

```jsonc
{ "type": "shopping", "items": [{ …, "price": 8900, "priceAtAdd": 8500,
    "priceChanged": true, "subtotal": 17800, "inStock": true, "isAvailable": true }],
  "itemCount": 2, "lineCount": 1, "subtotal": 17800, "taxAmount": 3204,
  "estimatedTotal": 21004, "hasIssues": true }
```

Adding a quote-only product to the shopping cart returns 400 with
*"This product is quote-only. Add it to your inquiry list instead."*

---

## Orders

| Method | Path | Guard |
| --- | --- | --- |
| POST | `/orders` | optional auth — **guest checkout supported** |
| GET | `/orders/my` | auth |
| GET | `/orders/:orderNumber` | owner, staff, or guest with `?email=` |
| POST | `/orders/:id/cancel` | owner or staff, only while `pending`/`confirmed` |

Guests must supply the checkout email to read an order, which stops order
numbers being enumerable.

**Pricing is entirely server-side.** Line prices come from the product record,
tax from `Setting.defaultTaxRate`, delivery from `Setting.shippingRules`
(exact city → `*` fallback, with free-above thresholds), and coupons are
re-validated on every use. The client's numbers are display-only.

**Stock is reserved atomically.** Each decrement is a conditional
`findOneAndUpdate({ _id, stock: { $gte: qty } })`, so two shoppers racing for
the last unit cannot both win; anything already taken is released if a later
line fails or if persistence throws. Cancellation returns stock.

COD orders open as `confirmed`; every other rail opens as `pending` awaiting
the gateway.

---

## Quotations (RFQ)

| Method | Path | Guard |
| --- | --- | --- |
| POST | `/quotations` | optional auth — guest RFQs are the norm in this trade |
| GET | `/quotations/my` | auth |
| GET | `/quotations/:quoteNumber` | owner, staff, or guest with `?email=` |
| POST | `/quotations/:id/respond` | owner or staff |

`respond` takes `{ action: "accept" | "reject" | "counter", message? }` and is
only valid while the quote is `quoted` or `negotiating`. A counter requires a
message. An expired `validUntil` flips the record to `expired` and returns 400.

---

## Reviews

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/reviews?product=&sort=&includePending=` | public — approved only unless staff |
| POST | `/reviews` | auth — one per product, `isVerifiedPurchase` set from delivered orders |
| PATCH | `/reviews/:id` | owner — edits return the review to moderation |
| DELETE | `/reviews/:id` | owner or staff |
| PATCH | `/reviews/:id/approval` | admin / manager |

Approval changes recompute `Product.ratingAvg` and `reviewCount` via the model
hook, counting approved reviews only.

---

## Misc

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/contact` | 20/hour; hidden `website` honeypot answers 201 and discards |
| POST | `/newsletter` | Re-subscribe reactivates rather than colliding |
| GET | `/settings` | Public config; `bankDetails` withheld |
| GET | `/banners?position=` | Live banners only (`startsAt`/`endsAt` respected) |
| GET | `/health` | Liveness + DB state |

---

## Middleware pipeline

```
helmet → cors(whitelist) → requestId → morgan→winston → json/urlencoded
      → cookieParser → sanitizeRequest → apiLimiter → /api/v1 router
      → notFound → errorHandler
```

| Middleware | Behaviour |
| --- | --- |
| `sanitizeRequest` | Recursively strips keys starting with `$` or containing `.` from body, query and params (depth-capped at 10). `{"email":{"$ne":null}}` becomes `{"email":{}}` and fails validation instead of matching every user. |
| `validate({ body, query, params })` | Zod. **Replaces** each segment with the parsed value, so controllers receive coerced, stripped, trusted input. |
| `protect` / `optionalAuth` / `restrictTo(...roles)` | Cookie first, `Bearer` fallback. |
| `errorHandler` | Normalises ApiError, ZodError, Mongoose `ValidationError`/`CastError`, duplicate-key 11000, `JsonWebTokenError`, `TokenExpiredError`. Unexpected errors become a generic 500 in production. |
| `apiLimiter` | 300 / 15 min per IP on `/api`. |
| `authLimiter` | **5 / 15 min**, `skipSuccessfulRequests`. |
| `passwordResetLimiter` | 3 / hour. |
| `publicWriteLimiter` | 20 / hour (contact, RFQ, checkout). |
| `imageUpload` / `documentUpload` | Multer memory storage, 5 MB, max 8 files. Images: JPEG/PNG/WebP/AVIF. Datasheets and RFQ attachments: PDF only. Buffers stream to Cloudinary — nothing touches disk. |

---

## Emails (Nodemailer)

Eight templates on a shared brand-styled, table-based, inline-CSS layout —
Gmail and Outlook strip `<style>` blocks:

`welcome` · `verify email` · `reset password` · `password changed` ·
`order confirmation` (customer) · `new order alert` (admin) ·
`quotation received` (customer) · `quotation ready` (customer) ·
`new RFQ alert` (admin) · `contact form alert` (admin)

Delivery is fire-and-forget with logging — a dead SMTP host degrades the
service, it never fails a request. SMTP is verified at boot with a warning
rather than a crash.

---

## Audit log

Mutations record `{ actor, action, entity, entityId, before, after, ip }` with
`passwordHash`, `refreshTokens`, reset/verify tokens and `costPrice` redacted
from every snapshot. Writes are fire-and-forget: an audit failure never breaks
the operation it records. Currently wired to password changes, order creation
and cancellation, quotation responses, and review moderation/deletion.
