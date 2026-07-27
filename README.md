# Fast Traders — fasttraders.co

Production e-commerce + RFQ platform for **Fast Traders**, an industrial & electrical
equipment trading business in Lahore, Pakistan.

> _"We Deal In All Kinds Of Industrial Equipment, Parts & Accessories"_

---

## Business model — hybrid commerce

Every product carries a `pricingMode`:

| Mode     | Behaviour                                                             |
| -------- | --------------------------------------------------------------------- |
| `retail` | Price shown, **Add to Cart**, online checkout & payment.               |
| `quote`  | Price hidden, **Request Quote**, goes to the Inquiry Cart.             |
| `both`   | Price shown **and** a **Bulk / Trade Price?** quote button.            |

The site therefore runs **two parallel carts**:

- **Shopping Cart** → Checkout → `Order`
- **Inquiry Cart** → RFQ form → `Quotation` → admin replies with a quote
  (an accepted quotation can be converted to an order by an admin).

---

## Tech stack

**Client** — Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS,
shadcn/ui, Zustand, TanStack Query, React Hook Form + Zod, Framer Motion, next/image.

**Server** — Node.js, Express, TypeScript (strict), MongoDB + Mongoose, JWT
(access + refresh, httpOnly cookies), bcrypt, Zod, Multer + Cloudinary, Nodemailer,
Winston, Helmet, CORS, express-rate-limit.

**Payments** — Stripe (international), JazzCash / Easypaisa adapters (placeholder),
Cash on Delivery, Bank Transfer.

**Deployment** — Client → Vercel · Server → Railway/Render · DB → MongoDB Atlas ·
Images → Cloudinary.

---

## Repository layout

```
fast-traders/
├── client/                  # Next.js 14 App Router frontend
│   ├── src/app/             # routes (App Router)
│   ├── src/components/      # ui/ layout/ product/ cart/ admin/ shared/
│   ├── src/lib/             # api client, utils, constants, validators, env
│   ├── src/hooks/           # reusable React hooks
│   ├── src/store/           # zustand slices (cart, inquiry, ui)
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

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Fill in every variable. **Both apps validate their environment with Zod at boot and
crash immediately if a required variable is missing or malformed.**

### 3. Run both apps

```bash
npm run dev          # server on :5000, client on :3000
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

_Phase 1: repository skeleton. Features are built in later phases._
