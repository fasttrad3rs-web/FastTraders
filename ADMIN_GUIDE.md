# Fast Traders — Admin Guide

For Sharjeel and the counter staff.

This guide is organised around **what happens during your day**, not around the software's menus. Every section starts with the situation you are actually in.

You do not need to understand anything technical to use this. If something here doesn't match what you see on screen, the software has changed and the guide hasn't — tell your developer.

**Sign in at:** `www.fasttraders.co/admin/login`

> 📷 **Screenshot 1** — the login screen

---

## The one rule

**Customers never see prices on this website.** Not the cost, not the last quoted price, not what's in stock. The site's whole job is to get somebody to phone you so *you* decide the price for *that* customer.

Anything you type into a field marked **internal** stays inside this admin panel. It is never shown on the public site.

---

## "An inquiry came in — what do I do?"

This is the main job. Everything else in this guide is occasional.

### 1. Open it

Go to **Inquiries** in the left menu. New ones sit in the **New** tab.

> 📷 **Screenshot 2** — the inquiry list, showing the status tabs across the top

A row shown **in red with a warning triangle** has been sitting for more than a full working day without anybody contacting the customer. Sundays don't count against you. These are the ones to do first — a buyer who doesn't hear back phones somebody else.

The dashboard shows the same number as **"Overdue — not yet contacted"**. Aim to keep it at zero.

### 2. Call the number

Click the inquiry number to open it. The customer's phone number is a link — click it on a mobile and it dials.

> 📷 **Screenshot 3** — an open inquiry, showing customer details and the item list

You'll see what they asked about: the products, the quantities, and anything they typed. For a China sourcing request you'll also see photos or files they attached — click to open them full size.

### 3. Use the internal figures while you're on the phone

Each product line shows what only you can see:

- **Internal cost** — what it costs you
- **Last quoted price** — what you quoted somebody last time
- **Supplier notes** — whatever you wrote about lead times or minimums

That's the point of the screen: everything you need to quote confidently is in front of you while the customer is still on the line.

### 4. Log what you quoted

After the call, fill in **Quoted amount** with the figure you gave them, then set the status.

This matters more than it looks. It's how the "last quoted price" appears next time, and how the dashboard knows what's in your pipeline. **If you don't log it, that information is only in your head.**

### 5. Set the status

| Status | Use it when |
|---|---|
| **New** | Nobody has called yet |
| **Contacted** | You spoke to them, no price given yet |
| **Quoted verbally** | You gave them a price on the phone |
| **Negotiating** | They're pushing on price or terms |
| **Won** | They're buying |
| **Lost** | They went elsewhere — **you must give a reason** |
| **No response** | You tried, they never picked up |

"Lost" asks for a reason on purpose. Three months of reasons tells you whether you're losing on price, on stock, or on delivery time — and that's worth knowing.

> 📷 **Screenshot 4** — the status dropdown and the quoted-amount field

### 6. Set a follow-up if it's not finished

Use **Add follow-up** to write what happened and pick a date to chase them.

> 📷 **Screenshot 5** — the follow-up box with a date picker

The dashboard shows **"Follow-ups due"** — chases whose date has arrived. Clear that list each morning and nothing slips.

The notes thread is internal and permanent. Anyone covering for you can read what was said and pick up the conversation properly.

---

## "Several inquiries need the same thing done"

Tick the boxes on the left of the list, and a bar appears at the top. You can **assign** a batch to one person, or **change status** on a batch.

You can't bulk-mark things as **Lost** — that needs a reason each time, and one reason pasted across twenty inquiries is worthless when you read it back later.

---

## "I need to add a product"

**Products → Add product.**

The essentials:

- **Name** — how a buyer would say it, e.g. *Terasaki S250-NJ MCCB 250A 36kA 3P*
- **Part number** — the manufacturer's code. People search by this.
- **Category** and **Brand**
- **Unit** — piece, metre, roll. "12" means nothing without it.

**Images:** drag them in, or click to browse. The first one is the main picture. Use a clear photo of the actual item — a photo of the real thing beats a catalogue render for trust.

**Datasheet:** upload the manufacturer's PDF if you have it. Buyers download these and it's a real reason to choose you.

**Internal fields** (cost, supplier notes) — fill these in. Only you see them, and they're what you'll want in front of you on the next call.

> 📷 **Screenshot 6** — the product form

---

## "Is this in stock or do we order it in?"

On the product form, **Availability**:

- **Ready stock** — it's on the shelf, you can hand it over today
- **Available on order** — you can get it, normally within days
- **Import on request** — it comes from abroad and takes longer

Also tick **Import item** for anything you bring in from overseas. Customers can filter the site to show only import items, and the product page tells them to expect a lead time — which sets expectations before they call, not after.

Be honest with these. "Ready stock" on something you don't have creates a disappointed phone call.

---

## "Somebody sent a China sourcing request with photos"

China sourcing requests are people asking for things **not in your catalogue** — usually someone standing in front of a failed part with a nameplate they can't read out.

They appear in the same Inquiries list, marked as China sourcing requests. Open one and you'll see their description plus whatever they attached.

If a file couldn't be read, it's listed as unreadable. That's normal — the customer can resend it. The important thing is the text and the phone number; the files are supporting evidence.

**Worth checking weekly:** the dashboard panel **"Asked for but not stocked"** lists what people keep requesting that you don't carry. That's a stocking decision backed by real demand instead of a hunch.

> 📷 **Screenshot 7** — a China sourcing request with attachments, and the dashboard panel

---

## "I want to add a customer testimonial"

**Testimonials → Add.**

Enter the quote, the person's name, and their company. Tick **Published** to show it on the site. Only enter things customers actually said — you can't undo a reputation.

---

## "I want to change the banner on the home page"

**Banners.**

- **Position: Hero** — the big slider at the top
- **Position: Promotional strip** — the thin navy bar under it

For a hero banner, upload **both** images: the wide one for computers and the tall **mobile image** for phones. Most of your visitors are on phones — if you skip the mobile image, they see no picture at all.

---

## "Our phone number / address changed"

**Settings → Store.**

Change it here and it updates everywhere on the site at once — header, footer, contact page, WhatsApp links.

**Important:** if you change the address, it must match your Google Business Profile **exactly**, character for character. "Shop No. 30" and "Shop #30" look identical to you and like two different businesses to Google.

**Settings → Bank details** are the account shown on quotes. Nothing is ever paid through the website.

**Settings → Announcement** is the coloured bar across the top of every page. Good for "Closed Friday for Eid".

---

## Things to check each morning

1. **Overdue** on the dashboard — should be zero
2. **Follow-ups due** — clear the list
3. **New** tab in Inquiries — call them

That's it. Five minutes.

---

## If something looks wrong

- A screen fails to load → it shows a **Reference** code. Write it down and send it to your developer; it's how they find the cause.
- An inquiry looks like spam → it's flagged, not deleted, on purpose. Genuine trade messages sometimes look like spam. Glance at it and decide yourself.
- You can't sign in after several wrong passwords → the account locks for 30 minutes. Wait, or ask your developer.

---

## Screenshots still to capture

Take these on a real screen with real data, then drop them in where marked:

1. Login screen
2. Inquiry list with the status tabs, including at least one overdue red row
3. An open inquiry showing customer details and item lines
4. The status dropdown and quoted-amount field
5. The follow-up box with the date picker
6. The product form (the main tab)
7. A China sourcing request with attachments, plus the "Asked for but not stocked" panel

Use realistic but not real customer data if you're going to share this file outside the business.
