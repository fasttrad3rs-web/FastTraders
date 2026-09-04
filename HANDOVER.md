# Handover — moving Fast Traders onto Sharjeel's accounts

A working script for one sitting, in order. Sharjeel is present and types his own
passwords; you drive the configuration.

Budget **three hours**. Most of it is waiting for verification emails.

---

## Where things stand

Two environments, and only one of them moves. Development stays on your accounts
on purpose — that is what stops a bug on your laptop from reaching the client.

| | Development (yours — **do not change**) | Production (his) | Done? |
|---|---|---|---|
| Database | `fast_traders_dev`, your Atlas | new Atlas cluster | ☐ |
| Images | Cloudinary `by9gftmc`, folder `fast-traders-dev` | Cloudinary `rlsvrkrb`, folder `fast-traders` | ☑ created |
| Email | Mailtrap sandbox — catches, never delivers | Gmail SMTP + app password | ☐ |
| Alerts to | `whoisabdullah254@gmail.com` | `fasttrad3rs@gmail.com` | ☐ |
| Site | `localhost:3000` | Vercel + `www.fasttraders.co` | ☐ |
| API | `localhost:5050` | Railway | ☐ |

### Remaining, in order

- [ ] **Rotate the Cloudinary API secret** — the current one was pasted into a chat
- [ ] **Untick PDF and ZIP** in his Cloudinary → Settings → Security → Restricted
      media types, or every datasheet link in an alert email returns 401
- [ ] **Register fasttraders.co** on his card, auto-renew on
- [ ] **Gmail 2-Step Verification** on his phone, backup codes on paper
- [ ] **Gmail app password**, 16 characters — the only way SMTP works since 2025
- [ ] **Production Atlas cluster** + database user, connection string noted
- [ ] **Transfer the GitHub repo**, confirm it is private
- [ ] **Railway project** on his GitHub login, Hobby plan, card added
- [ ] **Vercel project** on his GitHub login, **Pro** plan (Hobby forbids commercial use)
- [ ] **Generate three production secrets** — both JWT secrets and `REVALIDATE_SECRET`
- [ ] **Fill the Railway and Vercel variables** from the tables below
- [ ] **`npm run seed:live`** against production — reference data, no demo products
- [ ] **`npm run create-admin`** with his email; he types the password
- [ ] **Walk the seven acceptance checks** in Session 3, on his phone, on mobile data

### Not moving, deliberately

- **Mailtrap** — a sandbox that catches mail and delivers nothing. Your tool.
  Nothing to transfer, and its credentials must never reach Railway.
- **Your Cloudinary account** — test uploads belong in your storage, not in his
  media library eating his free-tier quota.
- **Your dev database** — the fifty demo products live here and nowhere else.
- **`ADMIN_EMAIL` in your `.env`** — inquiry alerts from your laptop go to you.

---

## The rule

Every account is created **by Sharjeel, on fasttrad3rs@gmail.com, with his card**,
and he then invites you as a collaborator. Never the other way round.

This is not ceremony. If these live on a developer's personal account, Fast Traders
cannot recover its own website when that developer is unreachable — and "unreachable"
includes a lost phone, a disputed invoice, or a bus. Anything that must be transferred
later is worse for both of you than getting it right in one afternoon.

You keep full access throughout. You lose nothing by him owning it.

---

## What it costs

Tell him this before you start, not after. Prices drift — confirm each at signup.

| Service | Plan | Cost | Notes |
|---|---|---|---|
| Domain `fasttraders.co` | — | ~$30/yr | `.co` renews dearer than it registers |
| MongoDB Atlas | M0 | Free | No automatic backups on M0 — see the warning below |
| Cloudinary | Free | Free | Generous for a catalogue this size |
| Railway (API) | Hobby | $5/mo | $5 of usage included; this app will sit under it |
| Vercel (site) | **Pro** | $20/mo | See below — Hobby is not an option here |
| Gmail SMTP | — | Free | ~500 mails/day, far above inquiry volume |

**About Vercel.** The free Hobby plan is restricted to non-commercial personal use.
A lead-generation site for a trading business is commercial by Vercel's own
definition, and running it on Hobby is a terms violation they do enforce. Budget
Pro, or host the front end somewhere else. Do not quietly deploy to Hobby and hope
— that is a site that can vanish without notice.

**About Atlas M0.** The free tier has no automatic backups. The inquiry history is
the accumulated commercial value of this system and exists nowhere else. Either
budget the paid tier, or commit to the scheduled `mongodump` in `MAINTENANCE.md` §1
and actually run it.

Total realistic: **~$25/month plus the domain.**

---

## Before he arrives — 30 minutes, you alone

1. **Confirm the app is green.** `npm run ci` on `main`. Do not hand over a red build.
2. **Read `PRE-PRODUCTION-AUDIT.md` §1.** Anything still open there is a blocker.
3. **Draft the two production `.env` files** with every value except the secrets you
   cannot know yet. Fill them in live.
4. **Generate the four secrets now** so you are not doing it while he watches:

   ```bash
   for k in JWT_ACCESS_SECRET JWT_REFRESH_SECRET REVALIDATE_SECRET; do
     echo "$k=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
   done
   ```

5. **Have a password manager open on his side**, or paper and a pen. He will create
   six passwords in ninety minutes and will not remember them.

---

## Session 1 — the accounts he creates

He types. You watch and advise. Order matters: later steps need earlier credentials.

### 1. Gmail: 2-Step Verification and an app password

Everything else hangs off this inbox, so secure it first.

1. **myaccount.google.com → Security → 2-Step Verification** → turn on, with his own
   phone. Not yours.
2. **Save the backup codes on paper.** If he loses the phone without these, he loses
   the account that owns the business.
3. Still under Security, search for **App passwords** → create one named
   `Fast Traders website`.
4. Copy the **16 characters**, no spaces. This is `SMTP_PASS`.

His normal Gmail password will **not** work for SMTP — Google removed that path in
2025. The app password option only appears once 2-Step Verification is on, which is
why it is step one.

> Google shows this password **once**. If it is lost, delete it and make another.

### 2. The domain

Register **fasttraders.co** on his card, at any mainstream registrar (Namecheap,
Cloudflare, Porkbun). Cloudflare sells at cost but has no phone support; for a
first-time owner, Namecheap is kinder.

- Turn **auto-renew ON**. An expired domain takes the site, the email routing and
  the search rankings with it.
- Turn **WHOIS privacy ON** — it is free almost everywhere and keeps his mobile
  number out of scraper databases.
- Registrar login goes on the paper list.

### 3. MongoDB Atlas

1. Sign up at `cloud.mongodb.com` with fasttrad3rs@gmail.com.
2. Create a project, `Fast Traders`. Create an **M0** cluster in the nearest region
   — Mumbai (`ap-south-1`) is the lowest latency to Lahore of the free options.
3. **Database Access** → add a user. Let Atlas **autogenerate** the password and
   save it. Do not invent one; this string ends up in a URI and a typed password
   with a `@` or `/` in it will break the connection string in a way that is
   maddening to debug.
4. **Network Access** → this needs a decision. Railway's Hobby plan does not give
   your service a fixed outbound IP, so an allowlist of specific addresses cannot
   work. Allow `0.0.0.0/0` and rely on the autogenerated password, which is the
   normal arrangement for this hosting tier. If that is not acceptable, Railway's
   static egress is a paid feature and the cost belongs in the table above.
5. **Project → Access Manager → invite you** as Project Owner.

### 4. Cloudinary

**Do this before any real photography is uploaded.** The window is open now and it
closes for good the moment Sharjeel starts adding stock — see the warning below.

1. Sharjeel signs up at `cloudinary.com` with fasttrad3rs@gmail.com, and sets the
   password himself.
2. **Settings → Access Keys** → note the **cloud name**, **API key** and
   **API secret**. These three go into the Railway variables in Session 2.
3. Nothing else. There is no collaborator step — see below.

Before switching, confirm nothing in the database still points at the old cloud:

```bash
mongosh "$MONGO_URI" --quiet \
  --eval 'db.products.countDocuments({ "images.url": /res\.cloudinary\.com/ })'
```

`0` means a clean switch. Anything higher is that many products whose photos must
be re-uploaded after the change.

> **Why the timing is not negotiable.** Image URLs are stored in MongoDB in full,
> and the cloud name is part of the string:
>
> ```
> https://res.cloudinary.com/by9gftmc/image/upload/.../breaker.jpg
>                            ^^^^^^^^
> ```
>
> A different Cloudinary account means a different cloud name, so every image
> already uploaded 404s — a catalogue of grey boxes. Today that costs nothing
> because nothing real has been uploaded. Once there are two hundred product
> photographs behind that cloud name, moving accounts means re-uploading every
> file and rewriting every URL in the database. **The account created now is the
> one Fast Traders keeps**, which is exactly why it must be his from the start.

> **One user only.** Cloudinary supports multiple logins on one account from the
> Advanced plan upward, so on the free tier there is no collaborator to invite.
> That is fine: the application authenticates with the API key and secret, not
> with a console login, and you hold those in the Railway variables. For the rare
> console task — checking usage, rotating a key — do it with him present.

**Your local `.env` does not change.** These three values go into **Railway
only**. Development keeps using your own Cloudinary account and its own folder,
for the same reason it keeps using Mailtrap: a test upload, a bug in a loop or a
script run against the wrong environment should land in your storage, not in the
client's media library, and should not eat their free-tier quota.

The split, in full:

| | Cloudinary account | Folder |
|---|---|---|
| Your machine | yours | `fast-traders-dev` |
| Railway (live) | Sharjeel's | `fast-traders` |

To prove his account works without touching your `.env`, override for one run —
`dotenv` does not overwrite variables that are already set, so these win:

```bash
cd server
CLOUDINARY_CLOUD_NAME=<his> \
CLOUDINARY_API_KEY=<his> \
CLOUDINARY_API_SECRET=<his> \
CLOUDINARY_FOLDER=fast-traders \
npm run verify:cloudinary
```w

It uploads, checks and deletes. Nothing is left in his account, and your `.env`
is untouched.

### 4b. Mailtrap — transfer nothing

Mailtrap is a **development sandbox**. It catches outgoing email and shows it to
you in a web inbox; it never delivers to a real recipient. It exists so that a bug
in a retry loop cannot send fifty emails to Sharjeel's phone at two in the morning.

It is your tool, not his. It has no place in his accounts and no place in
production.

- **Leave it on your personal account.** Nothing to transfer, nothing to hand over.
- **Do not put Mailtrap credentials in Railway.** Production uses Gmail SMTP — the
  app password from step 1. If Mailtrap credentials reach production, every inquiry
  alert disappears into a sandbox and the shop never learns it has a lead.
- Your local `server/.env` keeps pointing at Mailtrap forever. That is correct and
  deliberate.

The one thing to check: the live site must send through `smtp.gmail.com`, and the
acceptance test in Session 3 is what proves it.

### 5. GitHub

1. He creates an account and enables 2FA.
2. You transfer the repository to him: **Settings → General → Danger Zone →
   Transfer ownership**, then he adds you back as a collaborator with write access.
3. Confirm the repo is **private**. `server/.env` is gitignored, but a private repo
   is the belt to that braces.

### 6. Railway — the API

1. Sign up at `railway.app` **with GitHub** (his new account).
2. New Project → Deploy from GitHub repo → pick the repo.
3. Root directory `server`. `railway.json` in the repo already carries the build and
   start commands.
4. Add the card, take the Hobby plan.
5. Invite you to the project.
6. **Do not set the variables yet** — that is Session 2.

### 7. Vercel — the site

1. Sign up at `vercel.com` **with GitHub** (his account).
2. Import the repo. Root directory `client`. Framework auto-detects as Next.js.
3. Take the **Pro** plan and add the card.
4. Invite you to the team.
5. Variables in Session 2.

---

## Session 2 — wiring it up

Now you drive. Paste values into the two dashboards, not into files on your laptop.

### Railway → Variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5050` |
| `MONGO_URI` | Atlas string, **with `/fast_traders` before the `?`** |
| `JWT_ACCESS_SECRET` | generated earlier |
| `JWT_REFRESH_SECRET` | generated earlier — a *different* one |
| `ACCESS_EXPIRY` | `15m` |
| `REFRESH_EXPIRY` | `7d` |
| `CLIENT_URL` | `https://www.fasttraders.co` |
| `CLOUDINARY_CLOUD_NAME` | from step 4 |
| `CLOUDINARY_API_KEY` | from step 4 |
| `CLOUDINARY_API_SECRET` | from step 4 |
| `CLOUDINARY_FOLDER` | `fast-traders` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `fasttrad3rs@gmail.com` |
| `SMTP_PASS` | the 16-character app password |
| `SMTP_FROM` | `Fast Traders <fasttrad3rs@gmail.com>` |
| `ADMIN_EMAIL` | `fasttrad3rs@gmail.com` |
| `LOG_LEVEL` | `info` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX` | `300` |
| `REVALIDATE_URL` | `https://www.fasttraders.co/api/revalidate` |
| `REVALIDATE_SECRET` | generated earlier |

Three that decide whether this works at all:

- **`ADMIN_EMAIL`** is where inquiry alerts land. Wrong here and the shop never
  hears about a lead. This is the single most consequential string in the file.
- **`CLIENT_URL`** is the CORS allowlist. Wrong here and every form on the live
  site fails with an error the browser explains only in the console.
- **`MONGO_URI`** must name the database. Atlas gives you
  `...mongodb.net/?retryWrites=true`. It must read
  `...mongodb.net/fast_traders?retryWrites=true`, or Mongo silently uses `test`
  and the site comes up empty with no error anywhere.

Leave `RECAPTCHA_*` and `TWILIO_*` unset. Both are optional, both are off unless
configured, and neither is needed on day one.

### Vercel → Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<railway-domain>/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.fasttraders.co` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `923244234990` |
| `REVALIDATE_SECRET` | **the same string as Railway** |

`NEXT_PUBLIC_*` values are compiled into the browser bundle. Never put a secret
in one. `REVALIDATE_SECRET` has no prefix precisely so it stays server-side.

If the two `REVALIDATE_SECRET` values differ, admin saves still succeed but the
storefront keeps serving stale pages for up to five minutes — the exact symptom
that makes staff think a toggle is broken.

### DNS

At the registrar, point the domain at Vercel using the records Vercel's Domains tab
gives you. Add both `fasttraders.co` and `www.fasttraders.co`, and set `www` as
primary so the canonical URLs, sitemap and OG tags all agree.

Propagation is usually minutes, occasionally hours. Do not start changing things
because it is not live in ninety seconds.

### If the Railway build fails with `EBUSY … rmdir '/app/node_modules/.cache'`

Already fixed in `railway.json`, recorded because the error names nothing useful.

Railway's builder sees the Next.js client in the repo and mounts a build cache
inside `node_modules/.cache`. `npm ci` **deletes `node_modules` wholesale**
before installing, and it cannot delete a live mount, so `rmdir` returns EBUSY
and the build dies at exit 240. The build command therefore uses `npm install`,
which installs in place rather than wiping first.

The cost is that `npm install` may resolve a newer patch version than
`package-lock.json` pins, where `npm ci` never would. If that determinism starts
to matter — a dependency breaking a deploy that worked yesterday — the durable
answer is a Dockerfile, which also stops the builder guessing about a client it
is not building.

### After the first successful build

Railway shows **Unexposed service** until you give it a public address:
**Settings → Networking → Generate Domain**. Until then the API has no URL, and
`NEXT_PUBLIC_API_URL` on Vercel has nothing to point at.

### Deploy, in this order

1. **Railway first.** Copy its public domain.
2. Put that domain into Vercel's `NEXT_PUBLIC_API_URL`, then deploy Vercel.
3. Come back and confirm Railway's `CLIENT_URL` and `REVALIDATE_URL` use the real
   domain, not the temporary `*.vercel.app` one.

### Filling the production database

A live database cannot start completely empty. `category` and `brand` are required
on every product, so with no taxonomy Sharjeel cannot create his first item — and
hand-typing twelve brands and a category tree on launch day is how slugs end up
disagreeing with the ones the storefront links to.

It must not start with fifty invented circuit breakers either. A customer finding
one and phoning about a product that does not exist is worse than an empty
catalogue.

`seed:live` is the line between the two:

```bash
cd server
MONGO_URI="<the production Atlas string>" npm run seed:live
```

That inserts the twelve real brands, the category tree, the shop's real address and
phone, and the hero banners with their real copy. **No products, no inquiries.**
The catalogue comes up empty and waiting for real stock, which is correct.

> **Never run plain `npm run seed` or `seed:destroy` against production.** The
> first inserts fifty demo products into a live catalogue; the second deletes every
> product, inquiry and follow-up the business has. Both now refuse to run when
> `NODE_ENV=production` unless you add `--force`. Do not reach for `--force`
> unless you are certain the database is empty and brand new.

### The production admin account

From your machine, pointed at the **production** `MONGO_URI`:

```bash
cd server
npm run create-admin -- --email fasttrad3rs@gmail.com --name "Sharjeel Bin Ejaz"
```

The password prints **once**. He types it in himself and writes it down; you should
not know it. He can change it later from the admin panel.

---

## Session 3 — proving it works

Do these with him watching, on his phone, on mobile data — not on the shop wifi.

1. **The site loads** at `https://www.fasttraders.co` and the padlock is closed.
2. **He signs in** at `/admin/login` with the account from Session 2.
3. **A product edit reaches the storefront.** Change a product's availability, save,
   then reload the public page. It should change immediately, not in five minutes.
   If it lags, the two `REVALIDATE_SECRET` values do not match.
4. **An inquiry arrives as email.** Submit the form on the live site as a customer
   would. The alert must land in fasttrad3rs@gmail.com **in the inbox, not spam**.
   If it lands in spam, mark "Not spam" and send a second — Gmail learns.
5. **Click-to-call and WhatsApp work from his phone.** Tap the header number: it
   should dial. Tap WhatsApp: it should open a chat with the message pre-filled.
   These are the two buttons the whole site exists to deliver, and they can only be
   tested on a real handset.
6. **An image uploads.** Add a photo to a product from the admin, on his account.
7. **`/sitemap.xml` and `/robots.txt`** both load.

Only when all seven pass is the handover done.

---

## After he leaves — same day

### Rotate what was exposed

Credentials for the development services were pasted into a chat during the build.
Treat them as public:

- **Cloudinary API secret** — Settings → Access Keys → generate new
- **Atlas database user password** — Database Access → Edit → autogenerate

Do this even though production uses new accounts. The old ones may still hold real
uploads and real inquiry history.

### Clean your machine

```bash
grep -rn "MONGO_URI\|CLOUDINARY_API_SECRET\|SMTP_PASS" ~/dev/FastTraders/*/.env*
```

Your local `.env` files should point at **development** services only — never at the
client's live database or his real SMTP. A retry loop in a bug can send fifty emails
to Sharjeel in under a minute, and a careless script against production deletes real
inquiries.

### Give him one piece of paper

Everything below, handwritten or printed, kept where he keeps business documents.
Not in an email, not in WhatsApp:

- The seven logins, each with which email created it
- The Gmail 2-Step backup codes
- The admin panel URL and his password
- Your phone number and what you are responsible for
- The renewal dates: domain (annual), Railway and Vercel (monthly)

Point at the domain renewal date specifically. It is the one that takes everything
down at once, and the one nobody remembers.

---

## Still to do, after the handover

Not blockers for launch, but they are what make the site earn its keep.

1. **Google Business Profile** — claim `Fast Traders`, Shop No. 30, Grace Tower,
   Bull Road. The address must match the site **character for character**.
   "Shop No. 30" and "Shop #30" read as two different businesses to Google. This is
   worth more for local trade than any amount of on-page SEO.
2. **Google Search Console** — add the property, submit `/sitemap.xml`.
3. **Real products.** Fifty demo items are still in the catalogue. Replacing them
   with real stock and real photographs is the critical path to the site being
   useful, and it needs Sharjeel's time, not yours.
4. **Uptime monitoring** — a free UptimeRobot check on the homepage and on
   `/api/v1/health`, alerting to both of you.

---

## What must never happen

- An account created on a developer's personal email "just for now"
- `npm run seed` against the production database
- A local `.env` pointing at the live database or the real SMTP
- The domain on auto-renew **off**
- `REVALIDATE_SECRET` differing between Railway and Vercel
- Any secret sent over WhatsApp or email, including to him

---

**Related:** `SETUP.md` for the development environment, `MAINTENANCE.md` for
backups, rotation and the runbook, `ADMIN_GUIDE.md` for Sharjeel and the counter
staff.
