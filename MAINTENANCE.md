# Maintenance

Operational runbook. For the developer, not for counter staff — staff want `ADMIN_GUIDE.md`.

---

## 1. Backups and restore

### What is backed up

**MongoDB Atlas** holds everything that matters: products, inquiries, follow-ups, settings, staff accounts. Cloudinary holds uploaded images and sourcing attachments.

Losing the database loses the inquiry history — the record of who asked for what and what was quoted. That is the accumulated commercial value of this system and it exists nowhere else.

### Setting it up

On the Atlas cluster: **Backup → Enable Cloud Backup**, daily snapshot, 7-day retention minimum. On the free M0 tier this is unavailable — if the cluster is M0, run the manual dump below on a schedule instead, and treat upgrading as a priority.

### Manual dump

```bash
mongodump --uri "$MONGODB_URI" --archive=fasttraders-$(date +%F).gz --gzip
```

### Restore

```bash
mongorestore --uri "$MONGODB_URI" --archive=fasttraders-2026-07-29.gz --gzip --drop
```

`--drop` replaces existing collections. On a live database that is destructive — restore into a *scratch* cluster first, confirm the data is what you expect, then repoint.

**Test the restore before you need it.** An untested backup is a hope, not a backup.

### Cloudinary

Images are not covered by Atlas backups. Cloudinary keeps its own copies, but if the account is ever closed the URLs die and every product photo with it. For a catalogue business that is worth a periodic export of the `fasttraders/` folder.

---

## 2. Rotating secrets

Rotate immediately if a secret is ever pasted into a chat, an email, a screenshot, or a commit.

| Secret | Where | How |
|---|---|---|
| `MONGODB_URI` password | Atlas → Database Access | Edit user → new password → update Railway |
| `CLOUDINARY_API_SECRET` | Cloudinary → Settings → Access Keys | Generate new key → update Railway |
| `JWT_ACCESS_SECRET` | Railway env | New 32+ char random string |
| `JWT_REFRESH_SECRET` | Railway env | New 32+ char random string |
| `SMTP_PASS` | Email provider | New app password |

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Rotating either JWT secret signs everybody out.** That is the intended behaviour — it is also how you eject an attacker. Do it deliberately, not at 5pm on a Friday.

`JWT_ACCESS_SECRET` also signs the public form tokens. Rotating it makes tokens issued in the previous two hours invalid; those visitors' submissions still go through, because an absent-or-invalid token is not treated as a rejection on its own.

### Accounts

Every production account — Atlas, Cloudinary, Railway, Vercel, the domain — should be **owned by fasttrad3rs@gmail.com** with the developer added as a collaborator. Not the other way round. If they are on a developer's personal account, Fast Traders cannot recover its own business when that developer is unreachable.

---

## 3. Adding an admin user

There is no "invite user" screen, deliberately — a public-facing invite flow on a two-person business is more attack surface than convenience.

```bash
cd server

# New account, password generated and printed once
npm run create-admin -- --email sharjeel@fasttraders.co --name "Sharjeel Bin Ejaz"

# Manager, with a password you choose
npm run create-admin -- --email staff@fasttraders.co --role manager --password 'chosen-password'

# Reset a forgotten password / unlock a locked account — same command, existing email
npm run create-admin -- --email staff@fasttraders.co
```

The generated password is printed **once** and stored only as a bcrypt hash. If it is lost, re-run the command.

**Roles:** `admin` sees everything. `manager` handles inquiries and products but not staff or settings.

**Removing someone who leaves:**

```bash
npm run create-admin -- --email staff@fasttraders.co --deactivate
```

This sets `isActive: false` **and** clears their refresh tokens. Deactivating alone leaves any signed-in session working until its token expires — which for somebody who has just left is exactly wrong, and is the step people forget.

---

## 4. If spam spikes

The public forms have no login in front of them, so this will happen eventually.

**What is already running,** in the order a request meets it:

1. Rate limit — 3/hour and 10/day per IP
2. Honeypot — a hidden field; a bot that fills it gets a cheerful "thank you" and nothing is saved
3. Time-to-submit — a server-signed timestamp; anything filled in under 3 seconds is discarded the same way
4. reCAPTCHA v3 — **off unless configured**, threshold 0.5
5. Keyword blocklist — flags, never deletes
6. Duplicate detection — same phone and same items within 10 minutes returns the original receipt

Caught submissions get a **success response**. That is intentional: telling a bot it was caught tells its author what to change.

### Turning the dial up

**First, look at the logs** and confirm it is actually spam:

```
[honeypot] Discarded a submission to /api/v1/inquiries from …
[form-timing] Discarded a submission to /api/v1/inquiries from … (reason=too_fast)
```

**If it's getting through, enable reCAPTCHA** — this is the strongest lever and it's already wired:

```
RECAPTCHA_SECRET_KEY=...
RECAPTCHA_SITE_KEY=...
RECAPTCHA_MIN_SCORE=0.5
```

Raise the threshold to 0.7 only if spam continues. Higher scores reject more real people, and a rejected buyer is silent — you will never hear about the ones you lost.

**Tightening the rate limit** is in `server/src/middleware/rateLimit.ts`. Be careful: an office behind one NAT shares an IP, so a genuine customer can inherit a colleague's quota.

**Adding blocklist terms** — `server/src/services/spam-score.service.ts`. Use phrases, not single words. `seo` alone matches "Seoul". The test file pins nine genuine trade messages that must never be flagged; if a new term trips one of those, the term is wrong.

### What not to do

Do not add a captcha to the front of every form. This audience is on mobile data with a phone in hand — friction on the inquiry form costs more than the spam does.

---

## 5. Re-enabling e-commerce later

The full priced-commerce build — cart, checkout, Stripe, orders, customer accounts — was working before the catalogue-only pivot. It was removed rather than hidden.

It is preserved in git. Find the last commit before the pivot:

```bash
git log --oneline --all -- server/src/models/Order.ts | tail -1
git tag pre-catalogue-pivot <that-sha>   # if not already tagged
```

**Do not merge that branch back.** Everything around it has moved on — the Inquiry model replaced Quotation, the product whitelist changed shape, the admin was rebuilt. Treat the old code as a *reference* for the pieces you want (the Stripe adapter, the checkout steps) and port them deliberately.

Before starting, re-read `scripts/verify/catalog-pivot.cjs`. Around 77 checks currently assert that no price reaches a public surface. Reintroducing commerce means changing those assertions on purpose, one at a time, and understanding what each was protecting.

---

## 6. Routine checks

**Weekly**

- `npm run ci` on main — typecheck, lint, 164 tests, both audits, build, bundle scan
- Skim the Railway logs for repeated 5xx
- Confirm a test inquiry still arrives at fasttrad3rs@gmail.com and not in spam

**Monthly**

- `npm audit` and patch anything high or critical
- Confirm the Atlas backup snapshot actually exists
- Check Search Console coverage for new crawl errors

**After every dependency bump**

- `npm run test:leak` at minimum. It is the one suite that fails silently in production if it is wrong.

---

## 7. Deployment order — the API goes first

**Deploy the backend before you build the frontend, every time.**

The storefront pages are ISR (`revalidate: 300`) and fetch their data at build
time. If the API is unreachable during `next build`, `serverFetch` catches the
failure and returns `null` by design — so the build **succeeds** and produces a
complete set of pages containing no products, no categories and no banners.
Those empty pages are then served to real visitors until the first
revalidation, five minutes later.

Next logs a raw `[TypeError: fetch failed]` per call — around thirty of them —
and nothing that explains the consequence. `serverFetch` now prints one plain
warning the first time it happens; if you see it in a production build, stop
and fix the API URL rather than shipping the result.

So:

1. Deploy the API to Railway and confirm `GET /api/v1/health` responds.
2. Set `NEXT_PUBLIC_API_URL` on Vercel to that live URL.
3. Build and deploy the frontend.

The CI workflow deliberately builds against an unreachable placeholder URL.
That is fine there — CI only needs to know the app *compiles and prerenders*,
which is exactly what catches errors like a missing Suspense boundary. It is
not a production build.

---

## 8. Health and monitoring

- `GET /api/v1/health` — reports database connection state. Railway health-checks this.
- `GET /` on the API — a plain ping outside the rate-limited tree.

Point an uptime monitor at both `www.fasttraders.co` and the API health endpoint, alerting to a phone. A shop that cannot receive inquiries is losing money silently — the site looks fine to Sharjeel while the API is down.

Sentry is **not yet installed** on either app. Until it is, production errors surface only as a Reference code a staff member reads out.

---

## 9. Known gaps

Current at handover — see `PRE-PRODUCTION-AUDIT.md` for the full list.

- No Sentry on either app
- No frontend or end-to-end tests
- Performance work not done: no caching layer, no bundle analysis, no Lighthouse baseline
- No accessibility audit
- Seed catalogue is demo data with placeholder images
