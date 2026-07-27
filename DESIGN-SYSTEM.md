# Fast Traders — Design System (Phase 5)

67 client files. Every component is wired to mock data, so Phase 6 swaps the
data source, not the markup.

Open `/style-guide` in the running app, or `docs/preview/style-guide-preview.html`
in any browser — that file is the real components server-rendered with the real
compiled Tailwind CSS.

---

## Tokens

| Token | Value | Role |
| --- | --- | --- |
| `brand-navy` | `#1B2A6B` | Primary — headers, buttons, table heads |
| `brand-cyan` | `#00AEEF` | Accent / CTA — add to cart, request quote |
| `brand-dark` | `#0F1B4C` | Gradient start, top strip, footer |
| `surface` | `#F7F9FC` | Page background |
| `foreground` | `#1A1A1A` | Body text |
| `muted-foreground` | `#5A6472` | Secondary text |

Container caps at **1400 px**. Default radius `rounded-lg` (8 px). Shadows are
soft and low-spread: `shadow-soft` → `shadow-card` → `shadow-card-hover` →
`shadow-panel`. Inter for body, Poppins for headings (bold, tight, uppercase-leaning).

Every colour resolves through a CSS variable in `globals.css`, so a dark theme
is a variable swap rather than a rewrite. A `.dark` block is already stubbed.

---

## Components — `src/components/ui`

| File | Exports |
| --- | --- |
| `button.tsx` | Button — 6 variants (primary, cta, outline, ghost, danger, link), 4 sizes, `isLoading` with `loadingText`, `block`, `asChild` |
| `input.tsx` | Input (leading/trailing icon, error state), Textarea |
| `label.tsx` | Label, **Field** — label + control + hint/error, wired for a11y |
| `select.tsx` | Select and parts (Radix) |
| `checkbox.tsx` | Checkbox (incl. indeterminate), RadioGroup, Switch |
| `slider.tsx` | Slider, **PriceRangeSlider** with live PKR labels |
| `card.tsx` | Card + Header/Title/Description/Content/Footer, `interactive` |
| `badge.tsx` | Badge (7 variants), **Chip** (removable filter), **StockBadge** |
| `avatar.tsx` | Avatar, AvatarImage, AvatarFallback, `initialsOf()` |
| `tabs.tsx` | Tabs, Accordion |
| `tooltip.tsx` | Tooltip, DropdownMenu |
| `dialog.tsx` | Dialog (modal) and **SheetContent** (drawer: left/right/bottom) |
| `alert.tsx` | Alert — info / success / warning / danger |
| `table.tsx` | Table parts + **DataTable** (client-side sortable) |
| `pagination.tsx` | Pagination (with `pageWindow` ellipsis logic), Breadcrumb |
| `feedback.tsx` | Spinner, Skeleton, ProductCardSkeleton, TableSkeleton, EmptyState, ErrorState |
| `commerce.tsx` | Rating, QuantityStepper, **PriceDisplay** |
| `toast.tsx` | Toaster (sonner), themed, offset above the mobile bottom nav |
| `separator.tsx` | Separator, SectionHeading (cyan rule) |

`PriceDisplay` is the component that makes the hybrid model visible: a
`quote`-only product renders **"Price on request"** rather than an empty space,
`both` shows price plus a bulk-quote button, `retail` shows price and discount.

---

## Layout

**Header — three tiers**

1. Navy top strip (desktop): tagline · landline · email · social.
2. White main bar (**sticky**): logo · search with category scope and live
   autocomplete · account · inquiry cart · shopping cart · WhatsApp CTA.
3. Navy nav bar (desktop): cyan **All Categories** mega-menu, primary links,
   highlighted Request a Quote.

Only tier 2 sticks. Pinning all three would eat 150 px of a phone viewport.

The mega-menu is three columns: category tree → children of the hovered
category → featured brands plus a promo panel.

**Mobile:** hamburger drawer with the full accordion tree and contact block,
collapsible search row, and a sticky five-item bottom nav (Home, Categories,
Search, Cart, Account) with the cart badge.

**Footer:** newsletter row → four columns (identity, quick links, top
categories, full contact card with address, mobile, landline, email, website)
→ 12-brand grayscale strip that colours on hover → legal bar.

**Global:** floating WhatsApp bubble at `bottom-24` so it clears the bottom nav,
scroll-to-top above it, announcement bar, `loading.tsx` / `error.tsx` /
`not-found.tsx`.

---

## State

- `store/cart-store.ts` — Zustand + persist. Both carts, hydration-guarded so
  the SSR badge (0) matches the first client render. Server stays the source of
  truth; this exists so badges render instantly.
- `store/ui-store.ts` — drawers, search panel, announcement dismissal.
- `lib/auth-context.tsx` — shape and `useAuth()` hook; Phase 6 swaps the
  placeholder state for a `GET /auth/me` query.
- Providers: TanStack Query → AuthProvider → TooltipProvider → cart hydration → Toaster.

---

## Accessibility

Verified against the server-rendered markup: `header` / `main` / `footer`
landmarks, five labelled `nav` regions, `role="combobox"` with
`aria-autocomplete`, `aria-expanded` and `aria-activedescendant` on search,
`aria-current="page"` on pagination and bottom nav, `aria-invalid` +
`role="alert"` on field errors, `aria-label` on all 19 icon-only buttons, and a
skip link. The 11 unlabelled inputs in the render are Radix's hidden mirror
inputs (`aria-hidden`, `tabindex="-1"`), which is correct.

---

## Bug found and fixed

`formatPKR` had been wrong since Phase 1. It used
`Intl.NumberFormat(style: 'currency', currencyDisplay: 'narrowSymbol')` then
`.replace('PKR', 'Rs.')` — but full ICU renders PKR as `"Rs"`, so the replace
never fired and prices displayed as **"Rs 12,500"** instead of the specified
**"Rs. 12,500"**. Worse, Node's small-icu build *does* emit `"PKR"`, so server
and browser would have disagreed and tripped a hydration mismatch on every
price on the page.

Now the symbol is composed manually and only the digits go through `Intl`,
which is deterministic across runtimes.

---

## Known constraint

`next build` cannot run in this environment — even a two-file Next.js app
exits with `SIGBUS` here, so it is the sandbox, not the code. Verification was
done with `tsc --noEmit` (strict), `next lint`, a Tailwind compile against the
real config, and a server-side render of every component through
`react-dom/server` (141 KB of HTML, no runtime errors). **Run `npm run build`
locally before the first deploy.**
