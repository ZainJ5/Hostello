# Hostello build contracts

The codebase is written against this file. Do not redefine anything described
here; import it. If something you need is missing, add it inside the directory
that owns it rather than editing files another area owns.

## Stack facts (Next.js 16.3)

- **JavaScript only.** No TypeScript, no `.ts`/`.tsx`. Use `.js`.
- App Router, React 19, Tailwind **v4** (CSS-first config in `app/globals.css`;
  there is no `tailwind.config.js`).
- `cookies()`, `headers()`, `params`, and `searchParams` are **async**, so
  always `await` them:
  ```js
  export default async function Page({ params, searchParams }) {
    const { slug } = await params
    const sp = await searchParams
  }
  ```
- `middleware.js` no longer exists. The file is **`proxy.js`** at the project
  root and exports a function named `proxy`. Node runtime only.
- Import alias is `@/*` → project root (e.g. `@/lib/db`, `@/components/ui/Button`).
- Mongo runs locally at `mongodb://127.0.0.1:27017/hostello` and is **already
  seeded**. Never re-seed; never drop collections.

## Design system

**`DESIGN.md` at the project root is the source of truth** for an Airbnb-derived
system: white canvas, near-black ink, and a single brand voltage (Rausch
`#ff385c`) used scarcely. Read it before writing UI.

Those decisions are compiled into tokens in `app/globals.css`.
**Never hardcode a hex value.**

| Purpose | Use |
|---|---|
| Brand | `bg-brand-500` (Rausch), `brand-700` for press, scale `brand-50…950` |
| Second high-emphasis action | `bg-foreground text-background` (ink fill) |
| Neutral ramp (was amber) | `accent-50…700` (greyscale, not a second brand colour) |
| Surfaces | `bg-background`, `bg-surface`, `bg-surface-sunken`, `bg-muted` |
| Text | `text-foreground`, `text-muted-foreground` |
| Lines | `border-border`, `border-border-strong` |
| Status | `text-success`, `text-warning`, `text-danger`, `text-info` (+ `-soft` bg) |
| Radius | `rounded-lg` (8px controls), `rounded-[var(--radius-card)]` (14px cards), `rounded-full` (pills) |
| Shadow | One tier only. `shadow-md` is it; the other names resolve to the same thing. |
| Type | `text-display`, `text-h1`, `text-h2`, `text-h3`; headings are weight **600**, not 700 |
| Numbers | add `tabular` to any figure that updates or aligns in a column |

Rules that are not negotiable:

- Icons come from `lucide-react`. **Never use an emoji as an icon.**
- Every interactive element: `cursor-pointer`, a visible hover state, a
  `focus-visible` ring, and a min 44×44px touch target (`h-11`+).
- One family only (Inter). There is no separate display face.
- Star ratings render in **ink**, never gold.
- At most **one** floating badge over a photo.
- Inputs focus to a 2px ink border, with no coloured glow ring.
- Transitions 150–300ms. Respect `prefers-reduced-motion` (already handled
  globally, so don't add inline animation that bypasses it).
- Body text ≥ 14px; contrast ≥ 4.5:1 both themes. Dark mode via the `.dark`
  class on `<html>`.
- Responsive at 375 / 768 / 1024 / 1440. No horizontal scroll on the page body;
  wide tables scroll inside their own `overflow-x-auto` container.
- Loading states use `<Skeleton>` sized like the content it replaces, never a
  bare spinner for a full page.
- Every list needs an `<EmptyState>` with an action.

## Shared UI kit (import, do not rebuild)

```js
import Button from '@/components/ui/Button'
// variant: primary | accent | secondary | outline | ghost | danger
// size: sm | md | lg | xl | icon ; props: href, loading, disabled

import Badge, { StatusBadge } from '@/components/ui/Badge'
// Badge tone: neutral|brand|accent|success|warning|danger|info|solid
// StatusBadge status="published|pending_review|pending|confirmed|approved|…"

import Card, { CardHeader, CardBody, StatCard } from '@/components/ui/Card'
// StatCard: label, value, delta (signed %), icon, hint

import { Field, Input, Textarea, Select, Checkbox } from '@/components/ui/Field'
// All render a visible <label>. Pass `error` for inline validation.

import { Skeleton, Spinner, EmptyState, Rating, Avatar, Alert } from '@/components/ui/Feedback'
// Rating: value, count, size, showValue
// EmptyState: icon, title, description, action

import HostelImage from '@/components/ui/HostelImage'
// Renders a branded monogram tile when `src` is falsy; 59 listings have no
// photo. Props: src, alt, name, fill, sizes, priority, className
```

Helpers in `@/lib/utils`: `cn`, `formatPKR`, `formatPriceRange`, `formatCompact`,
`formatDate`, `timeAgo`, `slugify`, `initials`, `haversineKm`, `normalizePhone`,
`whatsappLink`, `serialize`.

## Server helpers

```js
import { connectDB } from '@/lib/db'
import { getSession, requireRole, createSession, destroySession,
         hashPassword, verifyPassword, generateCode, hashCode, codeMatches } from '@/lib/auth'
import { sendVerificationCode, sendNotification } from '@/lib/mail'
import { handler, ok, created, fail, readJson, clientIp } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
```

Route handlers are always wrapped:

```js
export const POST = handler(async (req) => {
  await connectDB()
  const session = await requireRole('owner', 'admin') // throws 401/403
  const body = await readJson(req)
  return ok({ ... })
})
```

`handler` converts Zod errors to `422 { fieldErrors }`, duplicate keys to 409,
and anything with `err.status` to that status.

**Always call `serialize()` on Mongoose docs before passing them to a Client
Component.** Raw ObjectId/Date are not serialisable across the boundary.

## Models (`@/models/*`)

`User` `Hostel` `Booking` `Review` `Payment` `VerificationCode` `AuditLog` `PageView`

Read the model file before querying it. Key facts:

- `User.passwordHash` has `select: false`, so use `.select('+passwordHash')`.
- `User.role`: `student | owner | admin`.
- `Hostel.status`: `draft | pending_payment | pending_review | published |
  rejected | suspended`. **Public queries must filter `status: 'published'`.**
- `Hostel` denormalises `rating`, `reviewCount`, `views`, `contactClicks` and
  `saveCount`. Update them when the underlying rows change.
- `Payment.status`: `pending | approved | rejected`. Approving a payment is
  what flips its hostel to `published`.
- `PageView` is the per-event table behind the analytics charts
  (`kind: view | contact | save`), 90-day TTL.

## Data on disk

- 124 published hostels + 3 awaiting review.
- Photos at `/uploads/hostels/*` (real, 225 files). 59 listings instead carry
  `https://images.unsplash.com/...` URLs; both are already allowed in
  `next.config.mjs`. 8 listings have **no** images, and `HostelImage` covers
  them.
- Cities: Islamabad (91), Rawalpindi (28), Lahore (3), Karachi (2).
- Universities: NUST, FAST, QAU, COMSATS, NUML, SZABIST, Riphah, RMU, FJWU,
  Arid Agriculture, Air University, Bahria University, Foundation University,
  IIUI, LUMS, UET, Punjab University, IBA, NED.
- Facility vocabulary is the `FACILITIES` array exported from `@/models/Hostel`.
- Price range PKR 5,000 – 35,000.

## Seeded accounts (password `Password123!`)

| Email | Role |
|---|---|
| `admin@hostello.tech` | admin |
| `owner@hostello.tech` | owner |
| `owner2@hostello.tech` | owner |
| `student@hostello.tech` | student |

## Routes and component ownership

Each product area owns its routes and its component directory.

| Area | Routes | Components |
|---|---|---|
| Public shell + home | `app/(public)/layout.js`, `app/(public)/page.js` | `components/public/*` |
| Browse + detail | `app/(public)/hostels/**` | `components/hostels/*` |
| Map | `app/(public)/map/**` | `components/map/*` |
| Auth | `app/(auth)/**`, `app/api/auth/**`, `proxy.js` | `components/auth/*` |
| Student | `app/(student)/**`, `app/api/bookings/**`, `app/api/reviews/**`, `app/api/saved/**` | `components/student/*` |
| Owner | `app/(owner)/**`, `app/api/owner/**` | `components/owner/*` |
| Admin | `app/(admin)/**`, `app/api/admin/**` | `components/admin/*` |
| Hostel read API | `app/api/hostels/**` | none |

## Shared component contracts (fixed; build to these signatures)

`components/public/HostelCard.js` has a default export:

```js
<HostelCard hostel={hostel} priority={false} showSave />
// hostel: { _id, slug, name, city, area, universities[], gender, price,
//   priceMin, priceMax, rating, reviewCount, images[], facilities[],
//   verified, featured, available, distanceKm }
```

`components/public/Navbar.js` has a default export and takes `{ session }` (may be null).
`components/public/Footer.js` has a default export and takes no props.

Verify changes with `npx next build`.
