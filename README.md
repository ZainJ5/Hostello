# Hostello

Pakistan's student hostel marketplace. Browse and compare verified hostels near
NUST, FAST, QAU, COMSATS, NUML and other campuses, with a student account area,
a self-service portal for hostel owners, and an admin console.

Next.js 16 (App Router, JavaScript) · MongoDB + Mongoose · Tailwind v4.

---

## Getting started

Requires Node 20+ and a local MongoDB on `127.0.0.1:27017`.

```bash
npm install
npm run data:build    # rebuild data/hostels.json from the legacy sources
npm run db:reset      # seed MongoDB (drops and repopulates)
npm run dev
```

Then open http://localhost:3000.

### Seeded accounts

Password for all of them: `Password123!`

| Email | Role | Lands on |
|---|---|---|
| `admin@hostello.tech` | admin | `/admin` |
| `owner@hostello.tech` | owner | `/owner` |
| `owner2@hostello.tech` | owner | `/owner` |
| `student@hostello.tech` | student | `/dashboard` |

### Environment

`.env.local` is created for you with working development defaults.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Defaults to `mongodb://127.0.0.1:27017/hostello` |
| `AUTH_SECRET` | Signs session JWTs. **Replace before deploying.** |
| `SMTP_HOST` … | Email delivery. Leave `SMTP_HOST` empty in development. |
| `UPLOAD_DIR` | Where listing photos and payment screenshots are written |

**Email in development**: with `SMTP_HOST` empty, verification codes are not
sent. They are printed to the server console in a boxed block, so signup, login,
password reset and account deletion all work end to end without a mail server.
Set the SMTP variables to send real mail.

---

## Where the data came from

The listings are real, carried over from the previous Hostello platform rather
than invented.

- **Records.** Merged from two sources by `scripts/build-dataset.js`:
  1. A production database export recovered from the legacy repo's git history
     (`backend/db_export/hostels.json` at commit `f9466fa`, deleted in a later
     commit). 66 records, authoritative for photography and pricing.
  2. The legacy `backend/seeds/*.js` files, which add wider campus coverage
     (Rawalpindi, RMU, FJWU, Arid, SZABIST, Riphah) but carry only stock image
     URLs.

  Merged on a normalised name, deduplicated, with facility strings and
  university abbreviations collapsed onto controlled vocabularies. Result:
  **124 hostels** in `data/hostels.json`.

- **Photography.** 225 files restored to `public/uploads/hostels/`. Every one
  of the 199 image paths referenced by the recovered export resolves to a real
  file, so 65 listings carry their genuine photos. 51 more fall back to the
  stock URLs recorded in the seeds. The remaining 8 have no imagery at all and
  render a branded monogram tile via `components/ui/HostelImage.js`; no photo
  is ever invented for a listing that lacks one.

`public/uploads/` is gitignored: it is runtime data, it is ~100MB, and the
payments subfolder holds sensitive screenshots. To restore the photography on a
fresh clone, copy the source folder back in:

```bash
cp -r /path/to/uploads/hostels/* public/uploads/hostels/
node scripts/make-sample-receipt.js   # placeholder for the demo payment rows
```

Seeded volumes: 124 published hostels + 3 awaiting review, 29 users, 489
reviews, 140 bookings, and ~36,000 page-view events spread over 90 days so the
analytics dashboards have a real trend to chart.

---

## Project layout

```
app/
  (public)/       marketing site, browse, hostel detail, map
  (auth)/         login, signup, email verification, password reset
  (student)/      /dashboard: bookings, saved, reviews, profile
  (owner)/        /owner: listings, payments, bookings, analytics
  (admin)/        /admin: moderation, approvals, platform analytics
  api/            route handlers
components/
  ui/             shared design-system kit (Button, Badge, Card, Field, …)
  public/  hostels/  map/  student/  owner/  admin/
lib/              db, auth, mail, api helpers, rate limiting, utils
models/           Mongoose schemas
scripts/          dataset build, seeding, asset generation
data/             hostels.json + the recovered legacy export
docs/CONTRACTS.md the design + architecture contract this app is built to
```

## Listing lifecycle

There is no payment gateway. An owner submits a listing, transfers the fee out
of band, and uploads a screenshot as proof; an admin reviews the image and
approves it, which is what publishes the hostel.

```
draft → pending_payment → pending_review → published
                              ↓
                          rejected (with a reason the owner can act on)
```

Only `published` listings are ever returned by public queries.

## Design system

`DESIGN.md` is the source of truth for an Airbnb-derived system: a pure white
canvas, near-black ink, and a single brand voltage (Rausch `#ff385c`) carrying
every primary CTA and save state, used scarcely. One type family (Inter, the
documented substitute for Airbnb Cereal), 8px controls, ~14px cards, pill search
surfaces, and exactly one shadow tier. Depth comes from photography and rounded
clipping, not stacked elevation.

Those decisions are compiled into tokens in `app/globals.css`; there is no
`tailwind.config.js` under Tailwind v4. Components reference semantic tokens
(`bg-surface`, `text-muted-foreground`, `border-border`) rather than raw scale
values, so the whole app rethemes from that one file. Implementation rules live
in `docs/CONTRACTS.md`.

The public site defaults to **light** rather than following the OS preference:
listing photography and the Rausch accent are calibrated against white, and the
source system ships no dark mode for its public web. Dark is still available via
the toggle and is remembered per visitor.

## Deployment notes

- Replace `AUTH_SECRET` with a 64-character random string.
- Point NGINX at `public/uploads` and serve it directly.
- Payment screenshots are served through an authenticated route, but the files
  also sit under `public/`. NGINX blocks `/uploads/payments/`; moving that
  directory outside the web root is the more durable fix.
# Hostello
