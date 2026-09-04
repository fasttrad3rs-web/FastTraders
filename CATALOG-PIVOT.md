# The catalogue-only pivot

Phases 1–7 built a hybrid commerce site: a shopping cart alongside an inquiry
cart, checkout, Stripe, orders, customer accounts. The client then changed the
brief:

> No prices are ever shown publicly. No cart, no checkout, no payments, no
> customer accounts. Every product CTA drives the customer to phone, WhatsApp,
> or an inquiry form. Fast Traders also sources/imports items to order.

This document is what changed and why. The phase docs below it describe the
site as it was and are kept as build history, not as a description of the
current system.

---

## What the site is now

One flow, one document:

```
browse catalogue → build an enquiry list → send an RFQ
        ↓                                       ↓
   call / WhatsApp                    admin prices it → quotation PDF
                                              ↓
                              customer accepts → settled offline
```

`Quotation` is the only commercial record. When a deal closes, an admin marks
it fulfilled against a reference — an invoice book number, a bank slip, a
delivery note. It does not become an Order, because there is no Order.

---

## Deleting is the easy half. Hiding a price is the hard half.

54 files went: cart, checkout, payments, orders, coupons, reviews, the account
area, the four auth pages. That part is mechanical.

The part worth writing down is that **removing a field from a type does not
hide it**, and four separate leaks survived the first pass. All four were found
by the verification harness, not by reading the code:

**1. The list projection re-enabled it.** `price` was marked `select: false` on
the model, which felt like the job was done. But `LIST_PROJECTION` was a
hand-written allow-list that still *named* `price` — and naming a `select:
false` path in a projection overrides the schema. Every product in every list
response carried its price. The model-level guard is not a backstop for an
explicit projection; it is the thing the projection can override.

**2. Search autocomplete projected it too**, along with a `pricingMode` field
that no longer existed.

**3. `variants[].price` was untouched.** `select: false` on the parent does not
reach into an embedded array, and the product detail endpoint has no projection
at all — it returns everything the schema does not hide. So the top-level price
was hidden and the variant price sat right next to it in the same response. It
is now declared `select: false` again at the subschema, with a comment saying
why the second declaration exists.

**4. The filter and sort were an oracle.** `?minPrice=&maxPrice=` and
`sort=price_asc` both still worked against the hidden field. Neither returns a
price — but a dozen requests binary-search any product's exact figure, and the
sort leaks the ordering of the whole catalogue in one page. Both are gone. The
price-range facet, which returned `{min, max}` outright, went with them.

`madeToOrder` replaced price as the second facetable dimension, which is the
filter a trade buyer actually wants: *is this on your shelf or are you importing
it?*

---

## Structured data

`productSchema` emits **no `offers` node and no `aggregateRating`**.

Advertising a price we do not quote would be a Merchant Center violation, and
an aggregate rating assembled from testimonials an admin typed in is not an
aggregate of verified buyers. Both would be fabricating a signal. What stays is
`sku`, `mpn` and `brand` — which is what part-number searches actually match on,
and the reason the specification table is `forceMount`ed into the SSR HTML.

---

## Reviews → testimonials

The `Review` model is gone. With no customer accounts there is no way to verify
a submitter, so a public review form is an invitation to spam and to
competitors.

`Testimonial` replaces it: entered by staff from real correspondence,
`isPublished` gates visibility so a quote can be captured now and cleared with
the customer later. Admin CRUD lives at `/admin/testimonials`.

`ratingAvg` and `reviewCount` were removed from the product entirely rather than
left at zero. Nothing could ever write them again, and a permanently-empty star
row reads as "nobody has ever bought this".

**The homepage testimonial section renders nothing when nothing is published.**
It previously shipped three placeholder quotes attributed to "Placeholder —
awaiting client approval". An absent section is better than invented quotes on a
live B2B site where a buyer in Lahore can ring the mill and ask.

---

## Dashboard

There is no revenue to report. The KPIs are the enquiry funnel:

| Was | Is |
| --- | --- |
| Revenue today / this month | New enquiries today / this week |
| Orders this month | Awaiting your quote |
| Average order value | Quoted this month (**pipeline**, not income) |
| Orders by status | Quotation pipeline |
| Revenue by brand / category | Enquiries by brand / category |
| Top products by revenue | Most enquired products |

The line chart plots **enquiries received against quotations sent**, on one
axis. The gap between the two lines is the unanswered backlog, which is the
number that actually needs looking at, and splitting it across two cards would
hide it.

Two follow-up prompts appear only when there is something to act on: shortlists
that were built and never sent (a warm lead that did not press the button), and
testimonials still in draft.

---

## Two things the pivot broke that nothing caught but a harness

**The admin could not sign in.** `/login` was deleted with the other auth pages,
but `middleware.ts` still redirected every unauthenticated `/admin` request
there — straight to a 404. Staff sign-in now lives at `/admin/login`: inside the
admin path so the whole staff area sits under one prefix, opted out of the
middleware guard so it cannot redirect to itself, and rendered without the
sidebar (`AdminShell` returns bare children for that one route) because wrapping
a login form in a nav full of links that all 401 would be absurd.

**A `populate` pointed at a deleted model.** `Quotation.convertedOrder` was
`ref: 'Order'`, and the admin quotation detail endpoint populated it. Mongoose
throws `MissingSchemaError` at runtime for a missing model — typechecking sees
nothing wrong, because the reference is a string. It is now a `fulfilment`
subdocument holding `{ at, reference, note }`.

Registration was closed at the same time (`POST /auth/register` is gone), which
left no way to create an account at all — so `POST /admin/users` was added,
admin-only, with a role enum that has no `customer` option.

---

## Verification

**Static pass — 41 checks.** Price privacy at every layer (model, projection,
embedded path, filter, sort, facet, type, rendered component), no commerce code
left, mirrored client/server types identical below their doc comments, staff
auth reachable, no payment surface, no file over 300 lines, no `any`.

**SSR pass — 12 checks.** Bundles the real components, server-renders them and
greps the HTML: no PKR figure on any surface, "Price on request" and a WhatsApp
CTA on every card, sourced items explaining their lead time, the specification
table present in the markup crawlers see, testimonials rendering and degrading
correctly, and the JSON-LD parsed and asserted node by node.

Both green. Four of the price leaks above were found by these checks after I had
already convinced myself the pivot was finished.

Three harness bugs were fixed rather than papered over: the mirrored-type
comparison flagged the doc comments that deliberately name the opposite file;
two "no forbidden identifier" checks matched the *comments explaining the
removal* rather than live code, so those now run against comment-stripped
source. A check that passes for the wrong reason is worse than no check.

`tsc --noEmit` strict and lint are clean in both workspaces.

---

## Still open

1. **No code has ever run against a real MongoDB.** The sandbox blocks the
   mongod download. Everything past the validation layer is typechecked and
   unit-tested and never integration-tested. Seed against Atlas and smoke-test
   before anything else — the `select: false` behaviour above is exactly the
   kind of thing that needs a real query to confirm.
2. `next build` and Lighthouse unmeasured — `next build` SIGBUSes in this
   sandbox even for a two-file app, so it is environmental, but it needs a local
   run before the first deploy.
3. The harnesses are throwaway scripts, not a CI suite.
4. **Seed data has no testimonials.** Deliberate — they would be fabricated. The
   homepage section will be absent until Sharjeel supplies real quotes.
5. Product photography, a lawyer's read of the three policy pages, and the exact
   GPS pin in `lib/seo/business.ts` are all still outstanding from Phase 6B.
