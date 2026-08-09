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

## 6. Naming

"Booking" stays structural: the Mongo collection, the API routes, the owner
and admin internals. Only what a student sees becomes "enquiry", including
URLs. No parallel `/api/enquiries` routes, since API paths are not user
visible and a second surface would need maintaining for nothing.
