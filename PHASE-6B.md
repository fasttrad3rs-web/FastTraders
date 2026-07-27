# Phase 6B — Transaction and account pages

44 new files, 27 new routes. Phase 6 is complete: **33 routes** total.

| Group | Routes |
| --- | --- |
| Commerce | `/cart` · `/inquiry` · `/request-quote` · `/checkout` |
| Orders | `/order-confirmation/[orderNumber]` · `/track-order` |
| Account | dashboard · orders · order detail · quotations · quotation detail · addresses · profile · password · wishlist |
| Auth | `/login` · `/register` · `/forgot-password` · `/reset-password/[token]` |
| Static | `/about` · `/contact` · `/industries` · `/faq` · `/privacy-policy` · `/terms` · `/shipping-returns` |

---

## The dual cart, end to end

`/cart` and `/inquiry` share `CartLines`; the only real difference is that an
inquiry line carries a free-text requirement ("3P, 36 kA, needed by the 20th")
which becomes the RFQ line note.

**`/inquiry` deliberately shows no prices.** Nothing on it has been quoted yet,
and putting a retail figure next to a "request a price" flow would confuse a
trade buyer.

Both are client-rendered on purpose — per-visitor, never cacheable, blocked in
robots.txt, so a Server Component would gain nothing.

The server owns both carts (Phase 3 persists them against a user or a guest
`ft_session_id` cookie). Mutations return the freshly hydrated cart, so the
cache is seeded directly rather than triggering a second round trip.

---

## Checkout

Four steps — Contact → Shipping → Payment → Review — with per-step validation
so a buyer can't skip ahead past a missing field. Guest checkout throughout;
signed-in users get their details pre-filled.

**Payment**: COD and bank transfer lead, because that is what this market
actually uses. Selecting bank transfer reveals the account details from
Settings. Card goes through Stripe. **JazzCash and Easypaisa are shown
disabled, not hidden** — the adapters exist server-side but aren't contracted
yet, and customers look for them; hiding them reads as "not supported".

The sidebar labels delivery as *"Calculated on review"* and the total as
*estimated*. Delivery, coupons and tax are computed server-side from the
delivery city and the coupon record — the client never decides what anything
costs.

---

## Quotation response

`/account/quotations/[quoteNumber]` renders the priced lines and gives the
customer **accept / reject / counter**. A counter requires a message. An
expired `validUntil` shows a warning explaining that prices move with the
exchange rate, and the action buttons are withdrawn.

---

## Order tracking

`/track-order` needs the order number **and** the checkout email. That pairing
is what stops order numbers being enumerable by anyone who works out the
`FT-YYYYMM-NNNN` format.

---

## Two honest calls

**Wishlist.** There is no saved-items model or endpoint — Phase 2 defined 15
models and this wasn't among them. Rather than fake it with localStorage and
silently lose it on a new device, the page says so plainly and points at the
inquiry list, which already does the "save for later" job for trade buyers.
Building it properly needs a model, endpoints and a phase.

**Legal pages.** `/privacy-policy`, `/terms` and `/shipping-returns` are
drafted from how the business actually operates — real delivery windows, real
warranty position, real returns terms. Each page carries a visible note to
Sharjeel that a lawyer should review it before launch. It is a starting
position, not legal advice, and it says so on the page rather than only in
this document.

---

## Verification

`tsc --noEmit` strict and `next lint` clean. No file over 300 lines — the
checkout page went to 335 during the build and was split into
`components/checkout/steps.tsx`.

A 10-check harness server-rendered the new components and inspected the output:

- order timeline, line items, PKR totals, discount line and tracking all render
- all five payment methods listed, with the two stubs genuinely `disabled`
- bank details appear only when bank transfer is selected
- auth shell and legal shell carry the real contact block — and the lawyer caveat is visible
- FAQPage JSON-LD is valid and matches the rendered questions
- auth pages are `noindex` with a canonical
- robots blocks all nine private/auth routes
- sitemap lists the eight new public pages and **none** of the private ones

10/10 pass, and the Phase 6A harness still passes 14/14 — no regression.

**Still not measured:** `next build` (SIGBUS in this sandbox, reproducible with
a two-file Next app) and Lighthouse, which needs a real browser against a real
server.

---

## Before launch

1. Run `npm run build` locally — the typechecker can't see bundler-level issues.
2. Run `npm run seed` against Atlas and smoke-test the API end to end. **No
   code in this project has ever run against a real MongoDB.**
3. Have a lawyer review the three policy pages.
4. Replace the branded SVG placeholders with real product photography.
5. Replace the three placeholder testimonials with attributable quotes.
6. Set the exact GPS pin in `lib/seo/business.ts` — currently an approximate
   Bull Road coordinate.
7. Measure Lighthouse and tune against the 90+ target.
