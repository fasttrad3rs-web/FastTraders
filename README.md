# Fast Traders — fasttraders.co

Production catalogue + RFQ platform for **Fast Traders**, an industrial & electrical
equipment trading business in Lahore, Pakistan.

> _"We Deal In All Kinds Of Industrial Equipment, Parts & Accessories"_

---

## Business model — catalogue only

**No price is ever shown publicly.** There is no cart, no checkout, no payments and
no customer accounts. The site is a lead generator: every product CTA drives the
visitor to phone, WhatsApp, or an enquiry.

```
browse catalogue → build an enquiry list → send an RFQ
        ↓                                       ↓
   call / WhatsApp                    admin prices it → quotation PDF
                                              ↓
                              customer accepts → settled offline
```

One flow, one document. `Quotation` is the only commercial record the system keeps;
when a deal closes it is marked fulfilled with a reference, not turned into an order.

Products carry `isMadeToOrder` — Fast Traders also sources and imports against an
order, and a sourced item says so instead of showing a stock count.

**Why prices are hidden, mechanically:** `price`, `costPrice` and `variants[].price`
are all `select: false` on the model, no public projection names them, and there is
no price filter, price sort or price-range facet — a range filter over a hidden
field is an oracle that would binary-search the number in a dozen requests.

---

## Tech stack

**Client** — Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS,
shadcn/ui, Zustand, TanStack Query, React Hook Form + Zod, Framer Motion, next/image.

**Server** — Node.js, Express, TypeScript (strict), MongoDB + Mongoose, JWT
(access + refresh, httpOnly cookies), bcrypt, Zod, Multer + Cloudinary, Nodemailer,
Winston, Helmet, CORS, express-rate-limit.

**Payments** — none. The site takes no money.

**Deployment** — Client → Vercel · Server → Railway/Render · DB → MongoDB Atlas ·
Images → Cloudinary.

---

## Repository layout

```
fast-traders/
├── client/                  # Next.js 14 App Router frontend
│   ├── src/app/             # routes (App Router)
│   ├── src/components/      # ui/ layout/ product/ catalog/ admin/ shared/
│   ├── src/lib/             # api client, utils, constants, validators, env
│   ├── src/hooks/           # reusable React hooks
│   ├── src/store/           # zustand slices (enquiry list, ui)
│   ├── src/types/           # shared type definitions (mirrors server)
│   └── public/              # static assets
├── server/
│   ├── src/config/          # env, db, logger, cloudinary
│   ├── src/models/          # mongoose schemas
│   ├── src/controllers/     # request handlers
│   ├── src/routes/          # /api/v1 routers
│   ├── src/services/        # business logic
│   ├── src/middleware/      # auth, error, validate, upload, rateLimit
│   ├── src/utils/           # ApiError, ApiResponse, asyncHandler, ...
│   ├── src/types/           # shared type definitions (mirrors client)
│   ├── src/seed/            # database seeders
│   └── src/server.ts        # entrypoint
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js **>= 20**
- MongoDB (local or an Atlas connection string)
- Cloudinary account (image hosting)
- SMTP credentials (Nodemailer)

### 1. Install

```bash
npm install          # installs both workspaces from the repo root
```

### 2. Configure environment

**[`SETUP.md`](./SETUP.md) walks through this end to end** — creating the Atlas
cluster, Cloudinary and Mailtrap accounts, and every value that goes in the two
env files, with the exact error message you get for each mistake.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
npm run doctor        # connects to each service and reports what is wrong
```

Both apps validate their environment with Zod at boot and crash immediately if
a required variable is missing or malformed.

#### Optional integrations

Two features are off unless configured. Neither is required to run, and the
sourcing form works fully without them — a shop cannot be blocked from taking
enquiries because a trial account lapsed. Each logs its status once at boot.

**reCAPTCHA v3** — scores public form submissions.

| Variable | Where to get it |
| --- | --- |
| `RECAPTCHA_SECRET_KEY` | google.com/recaptcha/admin → register a v3 site |
| `RECAPTCHA_MIN_SCORE` | Optional. Defaults to `0.5`, Google's own threshold |

A low score never rejects the customer. The inquiry is recorded and flagged for
staff instead — a real buyer on a shared office IP can score badly through no
fault of their own, and refusing them loses a sale to stop a nuisance.

**Twilio WhatsApp/SMS alerts** — pings the counter phone on every new inquiry.

| Variable | Where to get it |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio console, starts `AC…` |
| `TWILIO_AUTH_TOKEN` | Paired with the SID |
| `TWILIO_FROM` | `whatsapp:+14155238886` for the sandbox, or a purchased SMS number |
| `TWILIO_ALERT_TO` | Optional. Defaults to `+923244234990` |

All four must be set for alerts to fire. Email remains the guaranteed channel;
this is the one that gets read within the hour, because the counter phone is in
somebody's hand and the inbox is not. Failures are logged and swallowed — a
Twilio outage must never turn a customer's successful enquiry into an error.

### 3. Run both apps

```bash
npm run dev          # server on :5050, client on :3000
```

| Script              | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Run client + server concurrently               |
| `npm run build`     | Build server then client                       |
| `npm run start`     | Run both in production mode                    |
| `npm run lint`      | ESLint across both workspaces                  |
| `npm run typecheck` | `tsc --noEmit` across both workspaces          |
| `npm run format`    | Prettier write across the repo                 |
| `npm run seed`      | Seed the database (categories, brands, admin)  |
| `npm run verify`    | 41 catalogue-only invariants (no build needed)  |

There is **no public sign-up**. The seed creates the first admin; further staff
accounts are made by an admin through `POST /api/v1/admin/users`. Staff sign in at
`/admin/login`.

---

## API conventions

Every endpoint responds with the same envelope:

```ts
{ success: boolean; message: string; data: T | null }
```

- Base path: `/api/v1`
- Auth: JWT access token (short-lived) + refresh token, both httpOnly cookies.
- On `401`, the client API wrapper transparently calls `/auth/refresh` once and
  replays the original request.
- Errors funnel through a single error handler; stack traces are never leaked in
  production.

---

## Brand tokens

| Token          | Value                   |
| -------------- | ----------------------- |
| Primary navy   | `#1B2A6B`               |
| Accent cyan    | `#00AEEF`               |
| Dark gradient  | `#0F1B4C` → `#1B2A6B`   |
| Neutral bg     | `#F7F9FC`               |
| Text           | `#1A1A1A` / `#5A6472`   |

Typography: **Inter** (body) / **Poppins** (headings). Feel: professional,
technical, high-contrast — think Schneider Electric or RS Components.

Available as Tailwind utilities: `brand-navy`, `brand-cyan`, `brand-dark`,
`brand-muted`, plus shadcn/ui semantic tokens.

---

## Conventions

- TypeScript **strict** everywhere. No `any`.
- Files stay under ~300 lines; split before they grow.
- Types are duplicated in `client/src/types` and `server/src/types` — **keep in sync**.
- Mobile-first. Pakistan traffic is mobile-heavy; budget for 3G.
- SEO is a first-class requirement (this is a lead-generation site).
- Accessibility: semantic HTML, alt text, keyboard nav, WCAG AA contrast.
- Copy is English-only for now, but strings are structured for future Urdu i18n.

---

## Contact (client)

**Fast Traders** — Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan
Mobile / WhatsApp: +92 324 4234990 · Landline: +92 42 37378460
Email: fasttrad3rs@gmail.com

---

## Verification

```bash
npm run verify       # 41 static checks, zero dependencies
```

Price privacy at every layer (model, projection, embedded path, filter, sort,
facet, type, rendered component), no commerce code left, mirrored client/server
types in sync, staff auth reachable, no file over 300 lines, no `any`. None of
this is a type error, so `tsc` cannot catch any of it.

A second **SSR pass** (12 checks) bundles the real components, server-renders
them and greps the HTML — proving no PKR figure reaches the browser and that the
specification table and testimonials are in the markup crawlers see. It needs
esbuild, so it lives outside the dependency tree.

Both are green. See `CATALOG-PIVOT.md` for what changed and what is still open.
