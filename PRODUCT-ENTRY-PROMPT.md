# Product entry prompt

Paste everything between the `---` markers into Gemini, attach the product
photographs, and send. It returns one block per product, with the fields in the
same order as the admin form's tabs, so you can work straight down the screen.

**Before you paste:** photograph the **nameplate** as well as the product. Every
figure in the catalogue comes from what is legible in the picture — the prompt
forbids guessing, so a blurry rating plate produces `NOT LEGIBLE` rather than a
confident wrong answer. That is the behaviour you want. A hallucinated ampere
rating on a live catalogue means a customer orders a 100 A breaker and collects
a 63 A one.

---

You are helping catalogue stock for **Fast Traders**, an industrial and
electrical equipment supplier in Lahore, Pakistan. I will attach photographs of
products. For each distinct product, produce one filled-in block using the
template at the end.

## The rule that matters most

**Never invent a technical figure.** Ampere ratings, breaking capacity, pole
count, voltage, IP rating, part numbers, model codes — transcribe these *only*
when they are legible in the photograph.

If a value is not legible, write exactly `NOT LEGIBLE`.
If a field is one you cannot know from a photograph, write exactly `LEAVE BLANK`.

A wrong rating in this catalogue means a customer is quoted and sold the wrong
part. An empty field costs nothing. Never fill a gap with a plausible-looking
value, and never infer a specification from a similar product you know of.

If a photograph shows several different items, treat each as its own product. If
you cannot tell what something is, say so and stop for that item.

## Fixed vocabularies — use these exact strings, nothing else

**Brand** — one of these twelve only. If the visible brand is not on this list,
write `NOT STOCKED: <name>` and I will decide:

    Terasaki · Mitsubishi Electric · Schneider Electric · Fuji Electric
    Hager · Autonics · IDEC · Pilz · WAGO · National · DELAB · Torex

**Category and Sub-category** — pick one top-level Category, then a Sub-category
from *that category's own list*. Never mix them across groups.

| Category | Valid Sub-categories |
|---|---|
| Switchgear | Circuit Breakers · Distribution Boards & Panels · Busbars & Enclosures |
| Automation | PLCs · HMIs · VFDs · Sensors · Encoders · Timers · Temperature Controllers |
| Cables & Wires | Power Cable · Control Cable · Instrumentation Cable · Flexible Cable |
| Control Components | Contactors · Relays · Push Buttons · Selector Switches · Indicators · Limit Switches · Terminal Blocks |
| Safety | Safety Relays · Light Curtains · E-Stops |
| Power | Transformers · Power Supplies · Capacitors · Motors & Starters |

For an MCB, MCCB, ACB, RCCB or ELCB: Category `Switchgear`, Sub-category
`Circuit Breakers`. Note the breaker type in the specifications instead.

**Availability** — exactly one of:
`Ready stock` · `Available on order` · `Import on request` · `Discontinued`

**Unit** — exactly one of: `piece` · `meter` · `roll` · `box` · `set`

**SKU** — build it, do not invent it. Three-letter brand code, a hyphen, then
the manufacturer part number in uppercase with spaces and slashes removed
(keep any hyphens that are part of the code itself).

| Brand | Code | Brand | Code |
|---|---|---|---|
| Terasaki | `TER` | IDEC | `IDE` |
| Mitsubishi Electric | `MIT` | Pilz | `PIL` |
| Schneider Electric | `SCH` | WAGO | `WAG` |
| Fuji Electric | `FUJ` | National | `NAT` |
| Hager | `HAG` | DELAB | `DEL` |
| Autonics | `AUT` | Torex | `TOR` |

Examples: `SCH-LC1D18M7` · `MIT-FX5U-32MTES` · `TER-AR208S-3P800`

Unbranded stock — busbar, DIN rail, generic hardware — uses `GEN` and a
descriptor that includes the size, because there is no part number to carry the
distinction: `GEN-BUSBAR-30X5`.

If the part number is not legible, write `SKU: NOT LEGIBLE` rather than
assembling one from a guess.

## Length limits, which are enforced by the form

- Product name: 3–200 characters
- Short description: one line, 400 characters maximum
- Full description: at least 10 characters, plain prose, no markdown
- SEO title: 70 characters maximum
- Meta description: 180 characters maximum

## Writing style

Buyers are electricians, panel builders and factory maintenance staff. Write
plainly and technically. No marketing language, no superlatives, no "high
quality" or "premium". Say what the part is, what it does, and where it is used.

**Never mention price, cost, discount or any figure in rupees.** This catalogue
shows no prices anywhere; every product asks the customer to call or enquire.

Pakistani English spelling. Use the manufacturer's own naming for series and
model codes exactly as printed.

---

## Template — repeat for each product

```
PRODUCT <n>

— Basic info —
Product name:
URL slug:                 (leave blank — generated from the name)
SKU:                      (brand code + hyphen + part number, per the table)
Manufacturer part number:
Category:
Sub-category:
Brand:
Short description:
Full description:
Tags:                     (comma separated, lowercase, 5–10 terms buyers search)
Warranty:                 (only if stated on the product or packaging)

— Pricing & stock —
Last quoted price (Rs.):  LEAVE BLANK
Internal cost (Rs.):      LEAVE BLANK
Availability:
Lead time:                (required if it is an import item, e.g. "2–3 weeks")
Import item:              Yes / No
Stock on hand:            LEAVE BLANK — I count this
Low-stock threshold:      LEAVE BLANK
Typical minimum qty:
Unit:

— Specifications —      (only what is legible; key: value, one per line)

— Variants —             LEAVE BLANK unless the photo clearly shows a range
— Datasheets —           LEAVE BLANK

— SEO —
SEO title:
Meta description:
Keywords:                 (comma separated)

— Confidence —
Read directly from the photo:
Inferred from product type:
Could not determine:
```

## Two rules the form itself enforces

- **`Ready stock` requires a stock figure above zero.** Since you are leaving
  stock blank, prefer `Available on order` unless the photograph clearly shows
  shelf quantity.
- **An import item must have a lead time.** If you answer `Import item: Yes`,
  you must give a Lead time, or the product cannot be saved.

Fill the **Confidence** section honestly. It is what I check before saving.

---

## After Gemini replies

Work down the admin form tab by tab — the blocks are in the same order as the
tabs: **Basic info → Pricing & stock → Images → Specifications → Variants →
Datasheets → SEO**.

Three things to do yourself, every time:

1. **Read the Confidence section first.** Anything under "Inferred from product
   type" is a guess about *category or use*, never about a rating — check it
   against the photograph before saving.
2. **Set Availability and Stock on hand** from the shelf, not from the screen.

You do not need to check the SKU for duplicates. The database has a unique index
on it, so a repeat fails the save with a clear message rather than overwriting
the product already there.

Upload the photographs on the **Images** tab after saving the product once —
the first image becomes the main picture.
