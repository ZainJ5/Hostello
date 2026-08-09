# Implementation notes, 2026 redesign

Running record of decisions, rejected alternatives, and every place the code
had to diverge from the Figma file. Read this before building any route.

Figma file: `NGn2ZcdIokcpYafpN17B2x`.

---

## 1. Data availability audit

Run once, before any page work, so that no route rediscovers this on its own.
Source: `data/hostels.json`, which is exactly what `scripts/seed-production.js`
writes, so it reflects the live database without querying it.

Regenerate with the script kept alongside this file's history, or by reading
the dataset directly. Counts are out of the 124 imported listings.

| Field | On model | Populated | What the design does when absent |
|---|---|---|---|
| Name, slug, city, gender, universities | yes | 124 (all) | always renders |
| Latitude and longitude | yes | 124 (all) | always renders |
| Price min and max, real range | yes | 124 (all) | always renders |
| Description | yes | 124 (all) | always renders |
| Facilities | yes | 123 (99%) | chips omitted on the one listing without any |
| Area line | yes | 120 (97%) | omitted |
| Photos, any | yes | 116 (94%) | photo slot has a designed empty state |
| Photos, real uploads | yes | 65 (52%) | 51 fall back to stock URLs, 8 have none |
| Contact phone | yes | 104 (84%) | **20 listings have no phone. Enquiry CTA must degrade** |
| Contact WhatsApp | yes | 101 (81%) | WhatsApp affordance omitted |
| Verified badge | yes | 95 (77%) | 29 render the hollow outline badge |
| Rating, legacy aggregate | yes | 119 (96%) | omitted below 1 |
| Review count, legacy aggregate | yes | 62 (50%) | see the caveat below |
| Distance to nearest campus, stored | yes | 66 (53%) | **do not use. Compute from lat/lng instead** |
| Mess menu, day map | yes | 6 (5%) | section omitted |
| Mess menu, photos | yes | 1 (1%) | section omitted |
| Contact name | yes | 9 (7%) | omitted |
| **Room types and bed counts** | yes | **0 (none)** | **bed strip cannot render. See section 2** |
| **Security deposit** | yes | **0 (none)** | deposit line omitted from the rent note |
| **House rules** | yes | **0 (none)** | section omitted entirely |
| **Street address** | yes | **0 (none)** | area line stands in |
| **Contact email** | yes | **0 (none)** | omitted |
| **Owner account on a listing** | yes | **0 (none)** | deliberate. Listings are directory entries |
| **View, contact and save counters** | yes | **0 (none)** | never rendered anywhere |

Collections that exist but hold nothing after a production seed: `Review`,
`Booking`, `PageView`, `Payment`, `AuditLog`.

Facility vocabulary in use, most common first: WiFi 112, Meals 109, Security
79, CCTV 36, Laundry 35, Housekeeping 32, Study Room 15, Power Backup 14,
Prayer Area 9, Parking 9, AC 8, Transport 6, Attached Bath 6, Kitchen 5,
Furnished 4, Outdoor Area 4, Gym 4, On-site Shop 4, Hot Water 3, Filtered
Water 2. Declared in the model but never used: Common Lounge, Elevator.

Coverage: 18 universities, 4 cities (Islamabad 91, Rawalpindi 28, Lahore 3,
Karachi 2).

### Consequences a route author must respect

- **Compute campus distance from `lat`/`lng`**, which every listing has, not
  from the stored `distanceKm`, which only half of them carry.
- **Guard the enquiry call to action on a phone number.** A fifth of listings
  have no phone and no WhatsApp.
- **Never render the deposit, house rules or a bed count.** They are empty on
  every listing today.
- **Rating without reviews.** 62 listings carry a legacy `reviewCount` while
  the `Review` collection is empty, so a listing can show a score with an
  empty reviews list. The figures are genuine legacy aggregates and the
  listing descriptions quote them, which is why they are preserved rather
  than zeroed.

---

## 2. The bed strip cannot render

`slot-strip/beds` 16:27 is the signature of the design and its description
states that "all 124 listings know the bed count and none of them know who is
in the beds", with `IDENTITY=UNKNOWN` as the day one tier.

The first half of that is not true. `rooms` is empty on all 124 listings,
there is no bed, room or capacity field anywhere in the dataset, and neither
seed script populates one. The bed count is exactly as unavailable as the
occupancy.

Drawing four dashed segments would assert a bed count the product does not
hold, which the provenance board forbids: absent, not a placeholder.

**Decision, confirmed with the client: ship with the strip absent.**
`components/ds/BedStrip.js` is complete and correct, and `HostelCard` renders
it only when a real `rooms[].capacity` exists. The day an owner records room
types, the strip appears in its unknown tier with no further work.

Consequence worth stating plainly: on day one the card is name, distance, rent
and chips. That is a good card and not a distinctive one.

### The same problem, one page deeper: the listing detail page

The detail page was designed around five sections. Every one of them is empty
on day one:

| Section | Field it renders | Populated |
|---|---|---|
| section/room-types-and-rent | `rooms` | 0 of 124 |
| section/who-is-in-each-room | bed counts and occupancy | 0 of 124 |
| section/house-rules | `rules` | 0 of 124 |
| section/mess-menu | `messMenu`, `messMenuImages` | 6 of 124, and 1 of 124 |
| section/reviews | `Review` documents | collection is empty |

What survives is photos, description, facilities, computed campus distances,
the rent range and contact. The deposit line inside the rent section also goes,
because `securityDeposit` is 0 on every listing.

So the page that the design makes the centre of the product renders, on day
one, as a photo, a paragraph, a facilities grid, a distance table and a phone
number. It is honest and it is much thinner than the Figma frame looks.

### Root cause, so this is not met a sixth time

**The design was built against what the About page promises a listing carries,
not against what the database actually holds.** That is why this has now
happened five separate times: bed occupancy, walk time, the compatibility
glyph, the bed count itself, and now most of the detail page.

The fix is never to invent the data. The site ships honest and thinner than
the file looks, and what fills it back in is owners entering their own
details, which is out of scope for this work and behind a frozen console.

Before designing or building any further section, check the audit table in
section 1 first.

### Do not over apply this rule

Occupancy can never populate, because it needs an owner tool that does not
exist and the owner console is frozen. The six roommate compatibility answers
populate the moment a student submits the form, because that feature creates
its own data. An empty roommate questionnaire is an ordinary empty state, not
invented data, and must not be gutted with the reasoning above.

---

## 3. Token layer

`app/globals.css`, appended below the existing system. **Strictly additive:
zero lines removed.** The admin and owner consoles keep the original tokens
and are untouched.

13 colours across two modes, 14 type styles. Dark mode reuses the existing
`.dark` class so `components/public/ThemeToggle.js` and its `hostello-theme`
localStorage key keep working unchanged.

### letterSpacing is a percentage, not pixels

The single most important correction in this work. `get_variable_defs` reports
`letterSpacing` as a percentage of the font size. Cross checked against
rendered output:

| Style | Reported | Renders as | Font size | Therefore |
|---|---|---|---|---|
| label | 2 | 0.26px | 13 | 2% |
| body/s | 0.5 | 0.065px | 13 | 0.5% |
| display/s | -1 | -0.2px | 20 | -1% |
| figure/l | -1 | -0.22px | 22 | -1% |

Converting as px divided by size made every value 7 to 13 times too wide.
Corrected on all 14 styles. The em value is percent divided by 100.

### Verified contrast

Every measured pair passes AA in both modes. `primary` on `surface` measures
**1.90:1** in light, exactly the figure the design file cites, which
independently confirms the extraction. That ratio is why the ink keyline on a
yellow control is load bearing and never comes off.

### One derived value

`color/error` has no dark mode value anywhere in the file, because the
dark-spot-check board contains no error frame. `#ea86b4` is derived to mirror
the light value's contrast: 7.63:1 on dark surface against 7.74:1 on white.
Marked as derived in the CSS. Replace it if the file ever gains a real one.

---

## 4. Divergences from the design file

| Where | Design says | Built as | Why |
|---|---|---|---|
| Listing card distance | "31 min walk to FJWU" | straight line km plus a band | The file corrects itself on `listing/campus-distance` 75:59: minutes were "a nicer decision input and an invented one" |
| Distance bands | walkable, a short ride, a commute | same | 6 km boundary is evidenced by the samples. The 2.5 km boundary carries over from the live site, since the file has no sample below 4.6 km |
| Primary button label | "Request to book" | "Send enquiry" | The sample label and the whole `batch-6/flows` board predate the booking to enquiry rename. Client confirmed both are stale |
| Logo minimum size | read-me says 24, logo-usage says 20 | 20 | Client confirmed the read-me is stale |
| Logo clear space | read-me says one slot width, logo-usage says one gap width | one gap width | The door mark has a gap, not slots. The read-me predates it |
| Listing card | no heart, no star, no Featured badge | same | Saving survives on the listing page and in the account area |
| Stray artboards | `125:14165` and `139:13866` sit on top of real boards | ignored | Their own layer names say they are leftovers |
| Dark mode toggle | no component exists in the 33 sets | restyle the existing `ThemeToggle` | Client instruction: preserve behaviour and the storage key |

---

## 5. Scope boundaries

Frozen, never edited: `app/(admin)`, `app/(owner)`, `components/ui`.

`components/ui` is shared by both audiences, so the student site gets a forked
set in `components/ds` built on the 2026 tokens. The consoles keep importing
the originals. Import sites counted at fork time: Button 27 student and 42
console, Feedback 34 and 37, Card 13 and 22, Badge 9 and 26, Field 11 and 15,
HostelImage 11 and 1.

The earlier em dash cleanup did change console strings, replacing bare em dash
placeholders with words such as "Not set". That predates the freeze and is the
only console change in this work.

---

## 6. Component specs already read out of Figma

Captured here so no future session spends a rate limited `get_design_context`
call, or its context budget, re-reading them. Every one is already built in
`components/ds`.

Shared focus pattern across every control: a transparent slot carries the
focus ring so the control never changes size between states. Buttons use a 4px
slot at radius 8; inputs and toggles use 3px at radius 7; filter chips use 3px
at radius 5. The control inside is always radius 4.

| Component | Node | Geometry | States |
|---|---|---|---|
| button/primary | 17:21 | slot p4 r8, control h48 px20 r4, border 1 | default, hover (keyline ink to cobalt), focus, pressed (inverts to ink with a yellow label), disabled (leaves yellow, muted ink on sunken), loading (spinner, same label) |
| chip/filter | 27:50 | slot p3 r5, chip h38 px12 r2, border 1 | default, selected (solid ink, inverse text), hover (cobalt keyline), focus, pressed, disabled |
| input/sort | 74:117 | slot p3 r7, control h44 px12 gap8 r4 | default, hover (cobalt), focus, open (ink keyline), disabled. Five, not seven |
| input/view-toggle | 74:153 | slot p3 r7, group r4, segments h44 px14 | grid, list, hover, focus, disabled. Selected is solid ink |
| nav/pagination | 78:55 | cells 44 square, r2, gap 6 desktop and 8 mobile | current is solid ink, idle hollow, ellipsis uses the hairline border, disabled Previous stays visible |
| badge/status | 16:32 | px10 py6 r2 | solid ink means verified, outline means not. Outline carries a surface fill, never transparent |
| card/hostel/search | 18:13 | w358, r4, border 1 hairline, body p16 gap12 | photo 4:3, no heart, no star, no Featured badge |
| photo-slot/4x3 | 18:12 | fixed 4:3, p12, badge bottom left | no scrim. Empty is a designed state |
| slot-strip/beds | 16:27 | segments flex fill, 12 tall, gap 4 | unknown, none, initials, named. See section 2 |
| listing/campus-distance | 75:59 | rows py8 with a hairline underline | campus tag, name, km in mono, band |

Sort options in the design, in order: Recommended, Rent low to high, Rent high
to low, Closest to campus, Most reviewed, Newest listing.

### Divergence: the sort menu is a native select

The design draws a custom menu carrying the only shadow in the system. The
build uses a native `select`, because it gives correct keyboard handling, a
real listbox to a screen reader, and the platform picker on a phone. The
closed control matches the frame exactly; the open menu is the platform's.

### Two sort options need care

`Closest to campus` is only meaningful when a campus filter is active, since
there is otherwise no origin to sort from. `Most reviewed` sorts on the legacy
`reviewCount`, which 62 of 124 listings carry while the `Review` collection is
empty.

The live site also has a `Top rated` sort that the design drops. It is a
working feature, so it is kept as a seventh option rather than removed.

### Still to read

`site-header` 73:66, four variants: Desktop, Mobile, Mobile menu open, Desktop
signed in. `site-footer` 73:156. Neither has been pulled yet.

---

## 7. Session handoff

**State at the close of session 2.**

Committed, local only, nothing pushed, nothing deployed:

| Commit | What |
|---|---|
| `a862b23` | Stopped tracking AGENTS.md |
| `ab337fe` | Token layer and the four typefaces |
| `af3ac11` | First seven ds primitives |
| `9bbeb79` | Implementation notes with the data audit |
| `04604e5` | Detail page collapse and root cause |
| `e4a52b4` | Browse controls added to the ds set |

`components/ds` now holds eleven components: Badge, BedStrip, Button, Chip,
Feedback, FilterChip, HostelCard, Pagination, PhotoSlot, SortSelect,
ViewToggle. Build passes. No raw hex, no em dashes, and `app/(admin)`,
`app/(owner)` and `components/ui` are untouched in every commit.

**Next, in order:**

1. Read `site-header` 73:66 and `site-footer` 73:156. They are the last two
   pieces of browse chrome and are shared by every route, so they are worth
   getting right before any page work.
2. Build `/hostels` end to end at 390 and 1440 in both modes. The data layer
   already works and is reusable as is: `components/hostels/query.js` holds
   the facet counts, `filters.js` the vocabulary and page size of 12. Only the
   presentation changes. Compute campus distance from `lat`/`lng`, never from
   the stored `distanceKm`.
3. Verify browse against the frames at both widths and both modes, and fix
   what that turns up.
4. Write and self review the roommate and community schemas. The hard
   constraint is that the six compatibility answers are never readable by
   another student, and it has to be enforced in the query rather than in a
   component.
5. Fan out the seven agent groups as grouped by the client. Nobody edits the
   token layer or a ds primitive; if one needs changing the agent stops and
   the change is made centrally.

**Rules that do not move:** local commits only, nothing pushed, nothing
deployed, no SSH. Everything through tokens, no raw hex or pixel values, seven
states with visible focus, 44px targets, responsive from 360 up, no em dashes
anywhere including comments, no invented data, occupancy renders as unknown,
and the ink keyline never comes off a yellow control.

---

## 8. Naming

"Booking" stays structural: the Mongo collection, the API routes, the owner
and admin internals. Only what a student sees becomes "enquiry", including
URLs. No parallel `/api/enquiries` routes, since API paths are not user
visible and a second surface would need maintaining for nothing.
