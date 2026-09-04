# Fast Traders — Phase 1 source dump

> **Superseded.** This document describes the site before the catalogue-only
> pivot — it still refers to prices, carts, checkout, payments, orders or
> customer accounts, none of which exist any more. Kept as build history.
> See [`CATALOG-PIVOT.md`](./CATALOG-PIVOT.md) for the current model.

Every file created by the Phase 1 scaffold, in full.
Total files: 59

---

## `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## `.gitignore`

```gitignore
# dependencies
node_modules/
.pnp
.pnp.js

# builds
dist/
build/
.next/
out/
*.tsbuildinfo
next-env.d.ts

# env
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
!.env.example

# logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# testing / coverage
coverage/
.nyc_output/

# caches
.eslintcache
.turbo/
.cache/

# uploads (multer temp)
server/uploads/
server/tmp/

# editors / os
.vscode/*
!.vscode/extensions.json
.idea/
.DS_Store
Thumbs.db

# vercel
.vercel
```

## `.nvmrc`

```ini
20
```

## `.prettierignore`

```gitignore
node_modules
.next
dist
build
coverage
package-lock.json
*.md
```

## `.prettierrc`

```
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn", "cva"]
}
```

## `README.md`

````markdown
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
````

## `package.json`

```json
{
  "name": "fast-traders",
  "version": "1.0.0",
  "private": true,
  "description": "Fast Traders — industrial & electrical equipment e-commerce + RFQ platform (Lahore, Pakistan)",
  "workspaces": [
    "client",
    "server"
  ],
  "scripts": {
    "dev": "concurrently -n \"SERVER,CLIENT\" -c \"blue,cyan\" \"npm:dev:server\" \"npm:dev:client\"",
    "dev:client": "npm --workspace client run dev",
    "dev:server": "npm --workspace server run dev",
    "build": "npm run build:server && npm run build:client",
    "build:client": "npm --workspace client run build",
    "build:server": "npm --workspace server run build",
    "start": "concurrently -n \"SERVER,CLIENT\" -c \"blue,cyan\" \"npm:start:server\" \"npm:start:client\"",
    "start:client": "npm --workspace client run start",
    "start:server": "npm --workspace server run start",
    "lint": "npm --workspace client run lint && npm --workspace server run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,css}\"",
    "typecheck": "npm --workspace client run typecheck && npm --workspace server run typecheck",
    "seed": "npm --workspace server run seed",
    "install:all": "npm install"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.9"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## `client/.env.example`

```bash
# ----------------------------------------------------------------------------
# Fast Traders — CLIENT environment
# Copy to `.env.local` and fill in. All vars are validated with Zod at boot
# (src/lib/env.ts) — a missing or malformed value crashes the app immediately.
# NOTE: NEXT_PUBLIC_* values are inlined into the browser bundle. Never put a
# secret here.
# ----------------------------------------------------------------------------

# Base URL of the Express API, including the version prefix.
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Canonical public URL of the site (used for SEO, sitemap, OG tags).
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# WhatsApp number in international format, digits only (no +, spaces or dashes).
NEXT_PUBLIC_WHATSAPP_NUMBER=923244234990

# Stripe publishable key (pk_test_... in development).
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

## `client/.eslintrc.json`

```json
{
  "root": true,
  "extends": ["next/core-web-vitals", "eslint-config-prettier"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "prefer-const": "error",
    "no-var": "error",
    "@next/next/no-img-element": "error"
  },
  "ignorePatterns": ["node_modules/", ".next/", "out/", "next-env.d.ts"]
}
```

## `client/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

## `client/next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Fail the production build on type or lint errors — never ship broken types.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  images: {
    // Cloudinary is the only remote image source.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }],
    // Pakistan traffic is mobile-heavy on 3G — favour small, modern formats.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Prepared for future Urdu localisation (currently English-only).
  // i18n routing will be handled by the App Router `[locale]` segment in a later phase.

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## `client/package.json`

```json
{
  "name": "@fast-traders/client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@tanstack/react-query": "^5.62.7",
    "@tanstack/react-query-devtools": "^5.62.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.468.0",
    "next": "^14.2.20",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.1",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.20",
    "eslint-config-prettier": "^9.1.0",
    "postcss": "^8.4.49",
    "prettier": "^3.4.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2"
  }
}
```

## `client/postcss.config.mjs`

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

## `client/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ---------------------------------------------------------------------------
   Fast Traders — design tokens
   Brand palette expressed as HSL triplets so Tailwind can apply opacity
   modifiers (e.g. `bg-brand-navy/80`).

     navy   #1B2A6B -> 229 60% 26%
     cyan   #00AEEF -> 196 100% 47%
     dark   #0F1B4C -> 228 67% 18%
     bg     #F7F9FC -> 216 45% 98%
     ink    #1A1A1A -> 0 0% 10%
     muted  #5A6472 -> 215 12% 40%
--------------------------------------------------------------------------- */

@layer base {
  :root {
    /* Raw brand palette */
    --brand-navy: 229 60% 26%;
    --brand-cyan: 196 100% 47%;
    --brand-dark: 228 67% 18%;
    --brand-surface: 216 45% 98%;
    --brand-ink: 0 0% 10%;
    --brand-muted: 215 12% 40%;

    /* shadcn/ui semantic tokens mapped onto the brand palette */
    --background: var(--brand-surface);
    --foreground: var(--brand-ink);

    --card: 0 0% 100%;
    --card-foreground: var(--brand-ink);

    --popover: 0 0% 100%;
    --popover-foreground: var(--brand-ink);

    /* Primary = navy. Accent/CTA = cyan. */
    --primary: var(--brand-navy);
    --primary-foreground: 0 0% 100%;

    --secondary: 216 30% 94%;
    --secondary-foreground: var(--brand-navy);

    --accent: var(--brand-cyan);
    --accent-foreground: var(--brand-dark);

    --muted: 216 30% 96%;
    --muted-foreground: var(--brand-muted);

    --destructive: 0 72% 45%;
    --destructive-foreground: 0 0% 100%;

    --success: 152 62% 34%;
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 45%;
    --warning-foreground: 0 0% 10%;

    --border: 216 20% 88%;
    --input: 216 20% 88%;
    --ring: var(--brand-cyan);

    --radius: 0.5rem;
  }

  .dark {
    --background: var(--brand-dark);
    --foreground: 0 0% 98%;

    --card: 229 55% 22%;
    --card-foreground: 0 0% 98%;

    --popover: 229 55% 22%;
    --popover-foreground: 0 0% 98%;

    --primary: var(--brand-cyan);
    --primary-foreground: var(--brand-dark);

    --secondary: 229 45% 30%;
    --secondary-foreground: 0 0% 98%;

    --accent: var(--brand-cyan);
    --accent-foreground: var(--brand-dark);

    --muted: 229 40% 28%;
    --muted-foreground: 216 20% 72%;

    --border: 229 40% 32%;
    --input: 229 40% 32%;
    --ring: var(--brand-cyan);
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Industrial heading treatment: tight tracking, heavy weight. */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    @apply font-heading font-bold tracking-tight;
  }

  /* Visible, WCAG-AA-friendly focus ring on every interactive element. */
  :focus-visible {
    @apply outline-none ring-2 ring-brand-cyan ring-offset-2 ring-offset-background;
  }

  /* Respect reduced-motion preferences (Framer Motion reads this too). */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  /* Screen-reader-only helper (used for accessible labels). */
  .sr-only-focusable:not(:focus):not(:focus-within) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .text-balance {
    text-wrap: balance;
  }
}
```

## `client/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { SITE } from '@/lib/constants';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Industrial & Electrical Equipment, Lahore`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  keywords: [
    'industrial equipment Lahore',
    'electrical equipment Pakistan',
    'circuit breakers Lahore',
    'MCB MCCB ACB supplier',
    'Schneider Electric Pakistan',
    'PLC HMI VFD Lahore',
  ],
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A6B',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## `client/src/app/page.tsx`

```tsx
import { SITE, CONTACT } from '@/lib/constants';

/**
 * Placeholder home page — Phase 1 only.
 * Replaced by the real marketing/catalogue homepage in a later phase.
 */
export default function HomePage(): JSX.Element {
  return (
    <main id="main" className="bg-brand-gradient flex min-h-dvh items-center">
      <div className="container py-20 text-white">
        <p className="text-brand-cyan text-sm font-semibold uppercase tracking-[0.2em]">
          {CONTACT.address.city}, {CONTACT.address.country}
        </p>
        <h1 className="mt-4 text-4xl uppercase sm:text-6xl">{SITE.name}</h1>
        <p className="text-balance mt-4 max-w-2xl text-lg text-white/80">{SITE.tagline}</p>
        <p className="mt-10 text-sm text-white/50">
          Repository skeleton in place — features arrive in the next phase.
        </p>
      </div>
    </main>
  );
}
```

## `client/src/app/providers.tsx`

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Client-side provider tree.
 * Kept separate from `layout.tsx` so the root layout stays a Server Component.
 */
export function Providers({ children }: { children: ReactNode }): JSX.Element {
  // One QueryClient per browser session; created lazily so it is never shared
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Pakistan is mobile-heavy on 3G — cache hard, refetch rarely.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

## `client/src/components/ui/button.tsx`

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui Button, re-skinned with the Fast Traders palette.
 * `cta` is the primary conversion variant (cyan with a navy hover).
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-brand-navy text-white hover:bg-brand-dark',
        cta: 'bg-brand-cyan text-white hover:bg-brand-navy',
        outline: 'border border-brand-navy/25 bg-transparent text-brand-navy hover:bg-brand-navy/5',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-brand-navy hover:bg-brand-navy/5',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-brand-cyan underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js `<Link>`). */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

## `client/src/lib/api-client.ts`

```ts
import { env } from './env';
import { ApiClientError } from './api-error';
import type { ApiErrorDetail, ApiResponse, HttpMethod } from '@/types/api';

/**
 * Typed API client for the Fast Traders Express backend.
 *
 * - Base URL comes from `NEXT_PUBLIC_API_URL` (already includes `/api/v1`).
 * - `credentials: 'include'` so the httpOnly access/refresh cookies travel.
 * - A `401` triggers exactly one transparent `POST /auth/refresh`, then the
 *   original request is replayed. Concurrent 401s share a single refresh call.
 * - Every method resolves to the standard `ApiResponse<T>` envelope.
 */

const REFRESH_PATH = '/auth/refresh';
const DEFAULT_TIMEOUT_MS = 20_000;

export interface RequestConfig {
  /** Extra headers merged over the defaults. */
  headers?: Record<string, string>;
  /** Query string parameters; `undefined`/`null` entries are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Abort the request after N milliseconds. Defaults to 20s. */
  timeoutMs?: number;
  /** Skip the automatic refresh-and-retry cycle (used by auth endpoints). */
  skipAuthRefresh?: boolean;
  /** Next.js fetch cache directives (server components / route handlers). */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  /** Caller-supplied abort signal. */
  signal?: AbortSignal;
}

/** Single-flight guard so parallel 401s trigger only one refresh round-trip. */
let refreshPromise: Promise<boolean> | null = null;

/** Emitted when the refresh token is dead; the auth store listens for this. */
export const AUTH_EXPIRED_EVENT = 'ft:auth-expired';

function notifyAuthExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

function buildUrl(path: string, params?: RequestConfig['params']): string {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Merge a caller signal with an internal timeout signal. */
function withTimeout(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return external ? AbortSignal.any([external, timeoutSignal]) : timeoutSignal;
}

async function parseBody<T>(response: Response): Promise<ApiResponse<T> | null> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return null;
  }
}

/** Ask the server for a fresh access token using the refresh cookie. */
async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async (): Promise<boolean> => {
    try {
      const response = await fetch(buildUrl(REFRESH_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: withTimeout(DEFAULT_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Release the guard on the next tick so queued callers reuse this result.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

async function execute<T>(
  method: HttpMethod,
  path: string,
  body: unknown,
  config: RequestConfig,
  isRetry: boolean,
): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...config.headers,
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path, config.params), {
      method,
      headers,
      credentials: 'include',
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: withTimeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS, config.signal),
      ...(config.cache ? { cache: config.cache } : {}),
      ...(config.next ? { next: config.next } : {}),
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiClientError(
      aborted ? 'The request timed out. Please check your connection.' : 'Network error. Please try again.',
      { isNetworkError: true },
    );
  }

  // Transparent refresh-and-replay, once per request.
  if (response.status === 401 && !isRetry && !config.skipAuthRefresh && path !== REFRESH_PATH) {
    const refreshed = await refreshSession();
    if (refreshed) return execute<T>(method, path, body, config, true);
    notifyAuthExpired();
  }

  const payload = await parseBody<T>(response);

  if (!response.ok || payload?.success === false) {
    const errors = (payload as { errors?: ApiErrorDetail[] } | null)?.errors ?? [];
    throw new ApiClientError(payload?.message ?? `Request failed with status ${response.status}`, {
      status: response.status,
      errors,
    });
  }

  return payload ?? { success: true, message: 'OK', data: null };
}

function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> {
  return execute<T>(method, path, body, config, false);
}

export const apiClient = {
  get: <T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('GET', path, undefined, config),

  post: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('POST', path, body, config),

  put: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('PUT', path, body, config),

  patch: <T>(path: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('PATCH', path, body, config),

  delete: <T>(path: string, config?: RequestConfig): Promise<ApiResponse<T>> =>
    request<T>('DELETE', path, undefined, config),
} as const;

/**
 * Unwrap an envelope to its payload, throwing when the server returned `null`.
 * Use for endpoints that are contractually guaranteed to return data.
 */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.data === null) {
    throw new ApiClientError(response.message || 'The server returned an empty response.', {
      status: 500,
    });
  }
  return response.data;
}

export { ApiClientError, isApiClientError } from './api-error';
```

## `client/src/lib/api-error.ts`

```ts
import type { ApiErrorDetail } from '@/types/api';

/**
 * Error thrown by the API client for any non-successful response,
 * network failure or timeout. Carries enough context for UI error states.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: { status?: number; errors?: ApiErrorDetail[]; isNetworkError?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status ?? 0;
    this.errors = options.errors ?? [];
    this.isNetworkError = options.isNetworkError ?? false;

    // Restore prototype chain (required when targeting ES5-compatible output).
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  /** Field-keyed map, convenient for hydrating React Hook Form errors. */
  get fieldErrors(): Record<string, string> {
    return this.errors.reduce<Record<string, string>>((acc, item) => {
      if (item.field) acc[item.field] = item.message;
      return acc;
    }, {});
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.status === 400;
  }
}

/** Narrow an unknown thrown value to an ApiClientError. */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
```

## `client/src/lib/constants.ts`

```ts
import { env } from './env';

/**
 * Static business data and site-wide constants.
 * Strings live here (rather than inline in components) so they can be swapped
 * for an i18n dictionary when Urdu support is added.
 */

export const SITE = {
  name: 'Fast Traders',
  legalName: 'Fast Traders',
  tagline: 'We Deal In All Kinds Of Industrial Equipment, Parts & Accessories',
  shortDescription:
    'Industrial and electrical equipment, parts and accessories supplier in Lahore, Pakistan.',
  url: env.NEXT_PUBLIC_SITE_URL,
  locale: 'en_PK',
  owner: 'Sharjeel Bin Ejaz',
} as const;

export const CONTACT = {
  address: {
    line1: 'Shop No. 30, Grace Tower',
    line2: 'Bull Road',
    city: 'Lahore',
    country: 'Pakistan',
    full: 'Shop No. 30, Grace Tower, Bull Road, Lahore, Pakistan',
  },
  mobile: '+92 324 4234990',
  landline: '+92 42 37378460',
  email: 'fasttrad3rs@gmail.com',
  whatsappDigits: env.NEXT_PUBLIC_WHATSAPP_NUMBER,
} as const;

export const CURRENCY = {
  code: 'PKR',
  symbol: 'Rs.',
} as const;

/** Product pricing behaviour — drives the dual cart system. */
export const PRICING_MODES = ['retail', 'quote', 'both'] as const;

/** Brands stocked / authorised. */
export const BRANDS = [
  'Terasaki',
  'National',
  'Fuji Electric',
  'Mitsubishi Electric',
  'Hager',
  'Schneider Electric',
  'Autonics',
  'IDEC',
  'DELAB',
  'Pilz',
  'WAGO',
  'Torex',
] as const;

/** Top-level product categories. */
export const PRODUCT_CATEGORIES = [
  'Circuit Breakers',
  'Cables & Wires',
  'Contactors & Relays',
  'Distribution Boards & Panels',
  'Busbars & Switchgear',
  'PLCs & HMIs',
  'VFDs & Drives',
  'Sensors',
  'Encoders',
  'Timers & Counters',
  'Temperature Controllers',
  'Push Buttons & Indicators',
  'Switches',
  'Safety Products',
  'Terminal Blocks & Connectors',
  'Power Supplies',
  'Transformers & Capacitors',
  'Motors & Starters',
  'Tools & Accessories',
] as const;

/** Storage keys for persisted Zustand slices. */
export const STORAGE_KEYS = {
  cart: 'ft.cart.v1',
  inquiry: 'ft.inquiry.v1',
  recentlyViewed: 'ft.recent.v1',
} as const;

/** Default pagination page size for catalogue listings. */
export const DEFAULT_PAGE_SIZE = 24;
```

## `client/src/lib/env.ts`

```ts
import { z } from 'zod';

/**
 * Client environment validation.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when it is
 * referenced *statically*, so every variable must be written out in full below —
 * destructuring or dynamic access would silently produce `undefined`.
 *
 * Parsing runs at module load. A missing or malformed variable throws during
 * the build (or on first render in dev), which is exactly what we want:
 * fail fast, never ship a half-configured site.
 */
const clientEnvSchema = z.object({
  /** Express API base URL, including the `/api/v1` version prefix. */
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),

  /** Canonical public site URL — used for SEO metadata, sitemap and OG tags. */
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL'),

  /** WhatsApp number, international format, digits only (e.g. 923244234990). */
  NEXT_PUBLIC_WHATSAPP_NUMBER: z
    .string()
    .regex(/^\d{10,15}$/, 'NEXT_PUBLIC_WHATSAPP_NUMBER must be 10-15 digits, no + or spaces'),

  /** Stripe publishable key (safe to expose to the browser). */
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `\n[env] Invalid client environment configuration:\n${details}\n\n` +
      `Copy client/.env.example to client/.env.local and fill in the missing values.\n`,
  );
}

export const env: ClientEnv = parsed.data;

/** Convenience flags. */
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
```

## `client/src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Pakistani Rupees.
 * Uses the en-PK locale so digit grouping matches local expectations.
 */
export function formatPKR(amount: number, options?: { withDecimals?: boolean }): string {
  const withDecimals = options?.withDecimals ?? false;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })
    .format(amount)
    .replace('PKR', 'Rs.');
}

/** Format an ISO date string for display (e.g. "12 Mar 2026"). */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Convert an arbitrary string into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Truncate text to `max` characters, appending an ellipsis when cut. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Build a wa.me deep link with an optional pre-filled message. */
export function whatsappLink(phoneDigits: string, message?: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Type-safe "this should never happen" guard for exhaustive switches. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
```

## `client/src/lib/validators.ts`

```ts
import { z } from 'zod';

/**
 * Shared Zod schemas used by React Hook Form and by the typed API client.
 * Kept intentionally small in Phase 1 — feature schemas are added alongside
 * their features.
 */

/** Pakistani mobile/landline, tolerant of +92, 0092 and local 0xxx formats. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+92|0092|0)?3\d{9}$|^(?:\+92|0092|0)?\d{2,3}\d{7,8}$/, 'Enter a valid Pakistani phone number');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

/** Generic pagination query used across catalogue endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
```

## `client/src/types/api.ts`

```ts
/**
 * API contract types.
 *
 * MIRRORED FILE — keep in sync with `server/src/types/api.ts`.
 * Every endpoint on the Express API returns the same envelope.
 */

/** Standard response envelope returned by every `/api/v1` endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/** Error payload attached to failed responses (validation errors, etc.). */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Shape of a non-2xx response body. */
export interface ApiErrorResponse extends ApiResponse<null> {
  success: false;
  errors?: ApiErrorDetail[];
  /** Present in non-production environments only. */
  stack?: string;
}

/** Envelope for paginated list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Canonical HTTP methods used by the client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
```

## `client/src/types/index.ts`

```ts
/**
 * Domain types shared across the client.
 *
 * MIRRORED FILE — keep in sync with `server/src/types/index.ts`.
 * Phase 1 defines only the primitives the architecture depends on; entity
 * models (Product, Order, Quotation, ...) land with their features.
 */

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated, HttpMethod } from './api';

/**
 * Hybrid commerce switch carried by every product.
 * - `retail` — priced and buyable online (Shopping Cart).
 * - `quote`  — price hidden, RFQ only (Inquiry Cart).
 * - `both`   — priced online *and* offers a bulk/trade quote.
 */
export type PricingMode = 'retail' | 'quote' | 'both';

/** Account roles. */
export type UserRole = 'customer' | 'admin';

/** Lifecycle of a customer order. */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Lifecycle of an RFQ / quotation. */
export type QuotationStatus =
  | 'new'
  | 'in_review'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

/** Supported payment rails. */
export type PaymentMethod = 'stripe' | 'jazzcash' | 'easypaisa' | 'cod' | 'bank_transfer';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

/** Supported locales — English now, Urdu planned. */
export type Locale = 'en' | 'ur';
```

## `client/tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Fast Traders design system.
 *
 * All colours resolve through CSS variables declared in `src/app/globals.css`
 * so that shadcn/ui semantic tokens and the raw brand palette stay in sync and
 * a future dark theme is a variable swap rather than a config rewrite.
 *
 * Brand palette (source of truth):
 *   navy    #1B2A6B   cyan   #00AEEF
 *   dark    #0F1B4C   bg     #F7F9FC
 *   ink     #1A1A1A   muted  #5A6472
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        /* ---------------- Brand palette ---------------- */
        brand: {
          navy: 'hsl(var(--brand-navy))',
          cyan: 'hsl(var(--brand-cyan))',
          dark: 'hsl(var(--brand-dark))',
          muted: 'hsl(var(--brand-muted))',
          ink: 'hsl(var(--brand-ink))',
          surface: 'hsl(var(--brand-surface))',
        },

        /* ------------- shadcn/ui semantic tokens ------------- */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
        'brand-gradient-r': 'linear-gradient(90deg, hsl(var(--brand-dark)) 0%, hsl(var(--brand-navy)) 100%)',
      },

      fontFamily: {
        /* Body copy */
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        /* Headings — industrial, tight, slightly uppercase-leaning */
        heading: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Technical UI needs a tight small size for spec tables / part numbers.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      boxShadow: {
        card: '0 1px 2px 0 rgb(27 42 107 / 0.04), 0 4px 16px -4px rgb(27 42 107 / 0.10)',
        'card-hover': '0 2px 4px 0 rgb(27 42 107 / 0.06), 0 12px 28px -6px rgb(27 42 107 / 0.16)',
        focus: '0 0 0 3px hsl(var(--brand-cyan) / 0.35)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
      },
    },
  },
  plugins: [animate],
};

export default config;
```

## `client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,

    /* strictness — no `any` allowed anywhere */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,

    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## `server/.env.example`

```bash
# ----------------------------------------------------------------------------
# Fast Traders — SERVER environment
# Copy to `.env` and fill in. Validated with Zod at boot (src/config/env.ts):
# the process exits with code 1 if anything required is missing or malformed.
# NEVER commit the real .env.
# ----------------------------------------------------------------------------

# --- Core -------------------------------------------------------------------
PORT=5000
NODE_ENV=development

# --- Database ---------------------------------------------------------------
MONGO_URI=mongodb://127.0.0.1:27017/fast_traders

# --- Auth -------------------------------------------------------------------
# Use long random strings, e.g. `openssl rand -base64 48`. Minimum 32 chars.
JWT_ACCESS_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret_32_chars
ACCESS_EXPIRY=15m
REFRESH_EXPIRY=7d

# --- CORS / links -----------------------------------------------------------
# Comma-separate to whitelist multiple origins (e.g. preview deployments).
CLIENT_URL=http://localhost:3000

# --- Cloudinary (product images) --------------------------------------------
CLOUDINARY_CLOUD_NAME=replace_me
CLOUDINARY_API_KEY=replace_me
CLOUDINARY_API_SECRET=replace_me
CLOUDINARY_FOLDER=fast-traders

# --- SMTP (Nodemailer) ------------------------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=fasttrad3rs@gmail.com
SMTP_PASS=replace_with_app_password
SMTP_FROM="Fast Traders <fasttrad3rs@gmail.com>"

# --- Payments ---------------------------------------------------------------
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me

# --- Ops --------------------------------------------------------------------
# Inbox that receives RFQ / order notifications.
ADMIN_EMAIL=fasttrad3rs@gmail.com
LOG_LEVEL=debug
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

## `server/.eslintrc.json`

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "eslint-config-prettier"
  ],
  "env": { "node": true, "es2022": true },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "warn",
      { "allowExpressions": true, "allowTypedFunctionExpressions": true }
    ],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": ["dist/", "node_modules/"]
}
```

## `server/nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts", "dist"],
  "exec": "tsx src/server.ts"
}
```

## `server/package.json`

```json
{
  "name": "@fast-traders/server",
  "version": "1.0.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "rimraf dist && tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint \"src/**/*.ts\"",
    "lint:fix": "eslint \"src/**/*.ts\" --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.ts\"",
    "seed": "tsx src/seed/index.ts",
    "seed:destroy": "tsx src/seed/index.ts --destroy"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cloudinary": "^2.5.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.4.1",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.16",
    "stripe": "^17.5.0",
    "winston": "^3.17.0",
    "winston-daily-rotate-file": "^5.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.10.2",
    "@types/nodemailer": "^6.4.17",
    "@typescript-eslint/eslint-plugin": "^8.18.1",
    "@typescript-eslint/parser": "^8.18.1",
    "eslint": "^8.57.1",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.4.2",
    "rimraf": "^6.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

## `server/src/app.ts`

```ts
import express, { type Application, type Request } from 'express';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env';
import { morganStream } from './config/logger';
import { apiLimiter, errorHandler, notFound, requestId } from './middleware';
import v1Routes from './routes';

/**
 * Express application factory.
 * Kept free of `listen()` and database concerns so it can be imported directly
 * by integration tests.
 */
export function createApp(): Application {
  const app = express();

  // Behind Vercel/Railway/Render proxies — required for correct req.ip and
  // for `secure` cookies to be issued.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  /* ----------------------------- Security ----------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  const allowedOrigins = new Set(env.CLIENT_URL);

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Allow same-origin / non-browser clients (curl, health checks, mobile).
      if (!origin) return callback(null, true);
      const normalised = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalised)) return callback(null, true);
      return callback(new Error(`Origin "${origin}" is not allowed by CORS`));
    },
    credentials: true, // httpOnly auth cookies must cross origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  };

  app.use(cors(corsOptions));

  /* ---------------------------- Observability -------------------------- */
  app.use(requestId);

  morgan.token('id', (req: Request) => req.requestId ?? '-');
  app.use(
    morgan(
      isProduction
        ? ':id :remote-addr :method :url :status :res[content-length] - :response-time ms'
        : ':method :url :status - :response-time ms',
      { stream: morganStream },
    ),
  );

  /* ------------------------------ Parsers ------------------------------ */
  // Stripe signature verification needs the untouched raw body, so the webhook
  // route is registered with express.raw() before the JSON parser in Phase 6.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  /* ------------------------------ Routes ------------------------------- */
  app.use('/api', apiLimiter);
  app.use('/api/v1', v1Routes);

  // Root ping — keeps platform health checks off the rate-limited /api tree.
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Fast Traders API. See /api/v1/health.',
      data: null,
    });
  });

  /* ------------------------- Errors (must be last) --------------------- */
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

## `server/src/config/cloudinary.ts`

```ts
import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { logger } from './logger';

/**
 * Cloudinary SDK singleton. Product imagery and brand assets are stored under
 * `env.CLOUDINARY_FOLDER`; Multer streams uploads straight through in Phase 2.
 */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

logger.info(`[cloudinary] Configured for cloud "${env.CLOUDINARY_CLOUD_NAME}"`);

export { cloudinary };
export const CLOUDINARY_FOLDER = env.CLOUDINARY_FOLDER;
```

## `server/src/config/db.ts`

```ts
import mongoose from 'mongoose';
import { env, isProduction } from './env';
import { logger } from './logger';

/**
 * MongoDB connection with bounded exponential-backoff retry and full
 * connection-event logging. Mongoose handles reconnection once connected;
 * the retry loop here covers the initial boot (Atlas cold start, DNS, etc.).
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Mask credentials before a URI ever reaches a log line. */
function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

function registerConnectionEvents(): void {
  const connection = mongoose.connection;

  connection.on('connected', () => {
    logger.info(`[db] Connected to MongoDB (${connection.name})`);
  });

  connection.on('reconnected', () => {
    logger.info('[db] Reconnected to MongoDB');
  });

  connection.on('disconnected', () => {
    logger.warn('[db] Disconnected from MongoDB');
  });

  connection.on('error', (error: Error) => {
    logger.error(`[db] Connection error: ${error.message}`, { stack: error.stack });
  });
}

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  // Verbose query logging is useful locally, far too noisy in production.
  mongoose.set('debug', !isProduction && env.LOG_LEVEL === 'debug');

  registerConnectionEvents();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      logger.info(`[db] Connecting to ${redactUri(env.MONGO_URI)} (attempt ${attempt}/${MAX_RETRIES})`);

      return await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
        minPoolSize: 1,
        autoIndex: !isProduction, // build indexes explicitly in production
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[db] Connection attempt ${attempt} failed: ${message}`);

      if (attempt === MAX_RETRIES) {
        throw new Error(`Could not connect to MongoDB after ${MAX_RETRIES} attempts: ${message}`);
      }

      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(`[db] Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error('[db] Unexpected end of connection routine');
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return;
  await mongoose.connection.close(false);
  logger.info('[db] MongoDB connection closed');
}
```

## `server/src/config/env.ts`

```ts
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env before anything else touches process.env.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** Comma-separated origin list -> trimmed, non-empty string array. */
const originListSchema = z
  .string()
  .min(1, 'CLIENT_URL is required')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )
  .refine((origins) => origins.length > 0, 'CLIENT_URL must contain at least one origin');

/** JWT duration strings such as `15m`, `7d`, `12h`, or a raw seconds value. */
const durationSchema = z
  .string()
  .regex(/^\d+(?:[smhdw])?$/, 'Expected a duration like 15m, 24h, 7d or a number of seconds');

const envSchema = z.object({
  /* ---------------------------- Core ---------------------------- */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  /* -------------------------- Database -------------------------- */
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGO_URI must start with mongodb:// or mongodb+srv://',
    ),

  /* ---------------------------- Auth ---------------------------- */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_EXPIRY: durationSchema.default('15m'),
  REFRESH_EXPIRY: durationSchema.default('7d'),

  /* ---------------------------- CORS ---------------------------- */
  CLIENT_URL: originListSchema,

  /* ------------------------- Cloudinary ------------------------- */
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_FOLDER: z.string().default('fast-traders'),

  /* ---------------------------- SMTP ---------------------------- */
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),

  /* -------------------------- Payments -------------------------- */
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  /* ----------------------------- Ops ---------------------------- */
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email address'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // The logger depends on env, so this one message must use the raw console.
  // eslint-disable-next-line no-console
  console.error(
    `\n[env] Invalid server environment configuration:\n${details}\n\n` +
      `Copy server/.env.example to server/.env and fill in the missing values.\n`,
  );
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
```

## `server/src/config/index.ts`

```ts
export { env, isProduction, isDevelopment, isTest, type Env } from './env';
export { logger, morganStream } from './logger';
export { connectDatabase, disconnectDatabase } from './db';
export { cloudinary, CLOUDINARY_FOLDER } from './cloudinary';
```

## `server/src/config/logger.ts`

```ts
import path from 'node:path';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { env, isProduction } from './env';

/**
 * Winston logger.
 * - Development: colourised, human-readable console output.
 * - Production: JSON to stdout (platform log drains) plus rotating files.
 */

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const body = typeof stack === 'string' ? stack : String(message);
  return `${String(ts)} ${level}: ${body}${extra}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction
      ? combine(timestamp(), errors({ stack: true }), splat(), json())
      : combine(
          colorize({ all: true }),
          timestamp({ format: 'HH:mm:ss' }),
          errors({ stack: true }),
          splat(),
          consoleFormat,
        ),
  }),
];

if (isProduction) {
  const logDir = path.resolve(process.cwd(), 'logs');

  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'fast-traders-api' },
  transports,
  exitOnError: false,
});

/** Morgan writes its HTTP access lines through Winston at the `http` level. */
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
```

## `server/src/middleware/auth.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import type { AuthUser, UserRole } from '../types';

/** Cookie names used for the httpOnly token pair. */
export const ACCESS_TOKEN_COOKIE = 'ft_access_token';
export const REFRESH_TOKEN_COOKIE = 'ft_refresh_token';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sub === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.role === 'admin' || candidate.role === 'customer')
  );
}

/** Read the access token from the httpOnly cookie, falling back to Bearer. */
function extractToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[ACCESS_TOKEN_COOKIE];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

/** Require a valid access token; attaches `req.user`. */
export function protect(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  try {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (!isAccessTokenPayload(decoded)) {
      next(ApiError.unauthorized('Malformed token payload'));
      return;
    }

    const user: AuthUser = { id: decoded.sub, email: decoded.email, role: decoded.role };
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Attach `req.user` when a valid token exists, but never reject. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (isAccessTokenPayload(decoded)) {
      req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    }
  } catch {
    // An invalid token is simply treated as anonymous here.
  }
  next();
}

/** Restrict a route to one or more roles. Must run after `protect`. */
export function restrictTo(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}
```

## `server/src/middleware/errorHandler.ts`

```ts
import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import type { ApiErrorDetail, ApiErrorResponse } from '../types/api';

interface NormalisedError {
  statusCode: number;
  message: string;
  errors: ApiErrorDetail[];
  isOperational: boolean;
}

/** Translate known error shapes into a client-safe ApiError-like structure. */
function normalise(error: unknown): NormalisedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      isOperational: error.isOperational,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      })),
      isOperational: true,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `Invalid value for "${error.path}"`,
      errors: [{ field: error.path, message: 'Malformed identifier' }],
      isOperational: true,
    };
  }

  // Duplicate key.
  if (error instanceof MongoServerError && error.code === 11000) {
    const field = Object.keys((error.keyValue ?? {}) as Record<string, unknown>)[0] ?? 'field';
    return {
      statusCode: 409,
      message: `A record with that ${field} already exists`,
      errors: [{ field, message: 'Must be unique' }],
      isOperational: true,
    };
  }

  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token', errors: [], isOperational: true };
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Session expired', errors: [], isOperational: true };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : 'Something went wrong',
    errors: [],
    isOperational: false,
  };
}

/**
 * Global error handler. Must be registered last and must keep all four
 * parameters — Express identifies error middleware by arity.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { statusCode, message, errors, isOperational } = normalise(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    ip: req.ip,
  };

  if (statusCode >= 500 || !isOperational) {
    logger.error(`[error] ${message}`, { ...logPayload, stack });
  } else {
    logger.warn(`[error] ${message}`, logPayload);
  }

  // Never leak internals in production: unexpected errors become a generic 500.
  const clientMessage = isProduction && !isOperational ? 'Something went wrong' : message;

  const body: ApiErrorResponse = {
    success: false,
    message: clientMessage,
    data: null,
    ...(errors.length > 0 ? { errors } : {}),
    ...(isProduction ? {} : { stack }),
  };

  res.status(statusCode).json(body);
}
```

## `server/src/middleware/index.ts`

```ts
export { requestId } from './requestId';
export { notFound } from './notFound';
export { errorHandler } from './errorHandler';
export { validate, type ValidationSchemas } from './validate';
export { apiLimiter, authLimiter, publicWriteLimiter } from './rateLimit';
export {
  protect,
  optionalAuth,
  restrictTo,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './auth';
export { upload, uploadSingleImage, uploadProductImages } from './upload';
```

## `server/src/middleware/notFound.ts`

```ts
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Catch-all for unmatched routes. Runs after every router so that a 404 is
 * emitted through the same error pipeline as everything else.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
```

## `server/src/middleware/rateLimit.ts`

```ts
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env, isTest } from '../config/env';

/**
 * Rate limiters. Behind a proxy (Railway/Render/Vercel) `trust proxy` must be
 * enabled on the app so the real client IP is used as the key.
 */

const shared = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  // Never throttle the test suite.
  skip: () => isTest,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    data: null,
  },
};

/** Applied to every `/api` route. */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Tight limiter for login / register / password-reset endpoints. */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    data: null,
  },
});

/** Limiter for public write endpoints (contact form, RFQ submission). */
export const publicWriteLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: 'Too many submissions. Please try again later.',
    data: null,
  },
});
```

## `server/src/middleware/requestId.ts`

```ts
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Assign a correlation id to every request so a log line can be traced back to
 * the exact client call. Honours an inbound `X-Request-Id` when present.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const id = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
```

## `server/src/middleware/upload.ts`

```ts
import type { Request } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { ApiError } from '../utils/ApiError';

/**
 * Multer configured with in-memory storage.
 *
 * Files are held as buffers and piped to Cloudinary by
 * `services/upload.service.ts` — nothing ever touches the server disk, which
 * matters on ephemeral hosts like Railway/Render.
 */

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(ApiError.badRequest('Only JPEG, PNG, WebP and AVIF images are allowed'));
}

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 8 },
});

export const uploadSingleImage = upload.single('image');
export const uploadProductImages = upload.array('images', 8);
```

## `server/src/middleware/validate.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AnyZodObject, ZodTypeAny } from 'zod';

/**
 * Validate and *replace* request segments with their parsed (coerced, stripped)
 * values, so controllers receive fully typed, trusted input.
 *
 *   router.post('/', validate({ body: createProductSchema }), controller);
 *
 * ZodErrors bubble to the global error handler, which formats them as
 * field-level 422 responses.
 */
export interface ValidationSchemas {
  body?: AnyZodObject | ZodTypeAny;
  query?: AnyZodObject | ZodTypeAny;
  params?: AnyZodObject | ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        const parsed: unknown = schemas.params.parse(req.params);
        req.params = parsed as typeof req.params;
      }
      if (schemas.query) {
        const parsed: unknown = schemas.query.parse(req.query);
        // `req.query` has only a getter in Express 5; assign via defineProperty.
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) {
        const parsed: unknown = schemas.body.parse(req.body);
        req.body = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

## `server/src/routes/health.routes.ts`

```ts
import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { sendSuccess } from '../utils/ApiResponse';

/**
 * Liveness / readiness probe. Used by Railway/Render health checks and by
 * uptime monitoring.
 */
const router: Router = Router();

const READY_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get('/', (_req, res) => {
  const dbState = READY_STATES[mongoose.connection.readyState] ?? 'unknown';

  sendSuccess(
    res,
    {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: dbState,
      timestamp: new Date().toISOString(),
    },
    'Fast Traders API is healthy',
  );
});

export default router;
```

## `server/src/routes/index.ts`

```ts
import { Router } from 'express';
import healthRoutes from './health.routes';

/**
 * `/api/v1` router.
 *
 * Feature routers are mounted here as each phase lands:
 *   auth, users, categories, brands, products, cart, orders,
 *   quotations, payments, uploads, admin.
 */
const router: Router = Router();

router.use('/health', healthRoutes);

export default router;
```

## `server/src/seed/index.ts`

```ts
/* eslint-disable @typescript-eslint/require-await --
 * The seeders are intentionally async: Phase 2 fills them with Mongoose calls.
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../config/logger';

/**
 * Database seeder.
 *
 *   npm run seed            # insert baseline data
 *   npm run seed:destroy    # remove seeded data
 *
 * Phase 1 wires the runner only. Seeders for brands, categories, the admin
 * account and demo products are added alongside their models.
 */

const shouldDestroy = process.argv.includes('--destroy');

async function seed(): Promise<void> {
  logger.info('[seed] Seeding baseline data...');
  // TODO(phase-2): seed brands, categories, admin user, demo products.
  logger.warn('[seed] No seeders registered yet — nothing to insert.');
}

async function destroy(): Promise<void> {
  logger.info('[seed] Removing seeded data...');
  // TODO(phase-2): drop seeded collections.
  logger.warn('[seed] No seeders registered yet — nothing to remove.');
}

async function run(): Promise<void> {
  await connectDatabase();
  try {
    await (shouldDestroy ? destroy() : seed());
    logger.info('[seed] Done.');
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);
  logger.error(`[seed] Failed: ${message}`);
  process.exit(1);
});
```

## `server/src/server.ts`

```ts
import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

/**
 * Entrypoint: validate env (side effect of importing ./config/env) → connect to
 * MongoDB → start HTTP server → wire graceful shutdown.
 */

const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[server] ${signal} received — shutting down gracefully`);

  // Hard exit if something hangs (open sockets, stuck query).
  const forceExit = setTimeout(() => {
    logger.error('[server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
      logger.info('[server] HTTP server closed');
    }

    await disconnectDatabase();
    clearTimeout(forceExit);
    logger.info('[server] Shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[server] Error during shutdown: ${message}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`[server] Fast Traders API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`[server] Allowed origins: ${env.CLIENT_URL.join(', ')}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`[server] Port ${env.PORT} is already in use`);
      process.exit(1);
    }
    throw error;
  });

  // Give slow 3G clients room to finish; must exceed the proxy's idle timeout.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

/* ------------------------- Process-level handlers ------------------------- */

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.stack : String(reason);
  logger.error(`[process] Unhandled promise rejection: ${message}`);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`[process] Uncaught exception: ${error.stack ?? error.message}`);
  void shutdown('uncaughtException', 1);
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack : String(error);
  logger.error(`[server] Failed to start: ${message}`);
  process.exit(1);
});
```

## `server/src/services/upload.service.ts`

```ts
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { CLOUDINARY_FOLDER, cloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

/**
 * Cloudinary upload helpers. Multer keeps files in memory; these functions
 * stream the buffers straight to Cloudinary.
 */

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const DEFAULT_OPTIONS: UploadApiOptions = {
  resource_type: 'image',
  // Cap stored dimensions; next/image handles responsive resizing downstream.
  transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto:good' }],
};

function toUploadedImage(result: UploadApiResponse): UploadedImage {
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

/** Upload a single in-memory file buffer to a Cloudinary subfolder. */
export function uploadBuffer(buffer: Buffer, subfolder = 'products'): Promise<UploadedImage> {
  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { ...DEFAULT_OPTIONS, folder: `${CLOUDINARY_FOLDER}/${subfolder}` },
      (error, result) => {
        if (error || !result) {
          reject(ApiError.internal(error?.message ?? 'Image upload failed', error));
          return;
        }
        resolve(toUploadedImage(result));
      },
    );
    stream.end(buffer);
  });
}

/** Upload many files in parallel. */
export function uploadBuffers(
  files: Express.Multer.File[],
  subfolder = 'products',
): Promise<UploadedImage[]> {
  return Promise.all(files.map((file) => uploadBuffer(file.buffer, subfolder)));
}

/** Remove an asset by its Cloudinary public id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
```

## `server/src/types/api.ts`

```ts
/**
 * API contract types.
 *
 * MIRRORED FILE — keep in sync with `client/src/types/api.ts`.
 */

/** Standard response envelope returned by every `/api/v1` endpoint. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

/** Error payload attached to failed responses (validation errors, etc.). */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Shape of a non-2xx response body. */
export interface ApiErrorResponse extends ApiResponse<null> {
  success: false;
  errors?: ApiErrorDetail[];
  /** Present in non-production environments only. */
  stack?: string;
}

/** Envelope for paginated list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

## `server/src/types/express.d.ts`

```ts
import type { AuthUser } from './index';

/**
 * Augment Express's Request with the authenticated user injected by the
 * `protect` middleware. Declared globally so no controller needs a cast.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Correlation id assigned per request, echoed in logs and error bodies. */
      requestId?: string;
    }
  }
}

export {};
```

## `server/src/types/index.ts`

```ts
/**
 * Domain types shared across the server.
 *
 * MIRRORED FILE — keep in sync with `client/src/types/index.ts`.
 * Phase 1 defines only the primitives the architecture depends on; entity
 * models (Product, Order, Quotation, ...) land with their features.
 */

export type { ApiResponse, ApiErrorResponse, ApiErrorDetail, Paginated } from './api';

/**
 * Hybrid commerce switch carried by every product.
 * - `retail` — priced and buyable online (Shopping Cart).
 * - `quote`  — price hidden, RFQ only (Inquiry Cart).
 * - `both`   — priced online *and* offers a bulk/trade quote.
 */
export type PricingMode = 'retail' | 'quote' | 'both';

/** Account roles. */
export type UserRole = 'customer' | 'admin';

/** Lifecycle of a customer order. */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Lifecycle of an RFQ / quotation. */
export type QuotationStatus =
  | 'new'
  | 'in_review'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

/** Supported payment rails. */
export type PaymentMethod = 'stripe' | 'jazzcash' | 'easypaisa' | 'cod' | 'bank_transfer';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

/** Supported locales — English now, Urdu planned. */
export type Locale = 'en' | 'ur';

/** Minimal identity attached to an authenticated request. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
```

## `server/src/utils/ApiError.ts`

```ts
import type { ApiErrorDetail } from '../types/api';

/**
 * Operational (expected) error. Anything thrown as an ApiError is safe to
 * surface to the client; everything else is treated as a bug and masked with a
 * generic 500 by the global error handler.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options: { errors?: ApiErrorDetail[]; isOperational?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = options.errors ?? [];
    this.isOperational = options.isOperational ?? true;
    if (options.cause !== undefined) this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(400, message, errors ? { errors } : {});
  }

  static unauthorized(message = 'You are not authenticated'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Validation failed', errors?: ApiErrorDetail[]): ApiError {
    return new ApiError(422, message, errors ? { errors } : {});
  }

  static tooManyRequests(message = 'Too many requests, please slow down'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Something went wrong', cause?: unknown): ApiError {
    return new ApiError(500, message, { isOperational: false, cause });
  }
}
```

## `server/src/utils/ApiResponse.ts`

```ts
import type { Response } from 'express';
import type { ApiResponse, Paginated } from '../types/api';

/**
 * Helpers that guarantee every endpoint emits the same envelope:
 *   { success, message, data }
 *
 * Typing `res` as `Response<ApiResponse<T>>` makes the payload shape part of
 * the signature, so a controller cannot accidentally send a bare object.
 */

export function sendSuccess<T>(
  res: Response<ApiResponse<T>>,
  data: T | null,
  message = 'Success',
  statusCode = 200,
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendCreated<T>(
  res: Response<ApiResponse<T>>,
  data: T,
  message = 'Created successfully',
): Response<ApiResponse<T>> {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(
  res: Response<ApiResponse<null>>,
  message = 'Deleted successfully',
): Response<ApiResponse<null>> {
  return sendSuccess(res, null, message, 200);
}

/** Build the pagination envelope from a slice of results and a total count. */
export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
```

## `server/src/utils/asyncHandler.ts`

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap an async route handler so rejected promises reach the global error
 * handler instead of becoming unhandled rejections.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
```

## `server/src/utils/index.ts`

```ts
export { ApiError } from './ApiError';
export { sendSuccess, sendCreated, sendNoContent, paginate } from './ApiResponse';
export { asyncHandler } from './asyncHandler';
```

## `server/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",

    /* strictness — no `any` allowed anywhere */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": false,
    "removeComments": false,
    "typeRoots": ["./node_modules/@types", "./src/types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```
