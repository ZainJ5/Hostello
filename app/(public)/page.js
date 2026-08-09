import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  GraduationCap,
  Handshake,
  ListChecks,
  MapPinned,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { formatCompact, formatPKR, serialize } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import Container from '@/components/public/Container';
import SearchBar from '@/components/public/SearchBar';
import HostelCard from '@/components/public/HostelCard';
import SectionHeading from '@/components/public/SectionHeading';
import UniversityRail from '@/components/public/UniversityRail';
import CityCard from '@/components/public/CityCard';

const PUBLISHED = { status: 'published' };

const CARD_FIELDS =
  'slug name city area universities gender price priceMin priceMax rating reviewCount ' +
  'images facilities verified featured available distanceKm';

/** The four markets the directory actually covers, in the order they matter. */
const FEATURED_CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

const EMPTY = {
  total: 0,
  verified: 0,
  reviews: 0,
  views: 0,
  minPrice: 0,
  cities: [],
  universities: [],
  featured: [],
};

/**
 * Everything the page needs in four round trips. A Mongo outage degrades the
 * page to its static copy rather than throwing a 500 at a visitor.
 */
async function loadHomeData() {
  try {
    await connectDB();

    const [totalsAgg, cityAgg, universityAgg, featuredDocs] = await Promise.all([
      Hostel.aggregate([
        { $match: PUBLISHED },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$verified', 1, 0] } },
            reviews: { $sum: '$reviewCount' },
            views: { $sum: '$views' },
            minPrice: { $min: '$priceMin' },
          },
        },
      ]),
      Hostel.aggregate([
        { $match: PUBLISHED },
        // Best-documented listings first, so the tile photo is a good one.
        { $sort: { verified: -1, reviewCount: -1, rating: -1 } },
        {
          $group: {
            _id: '$city',
            count: { $sum: 1 },
            photos: { $push: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, null] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Hostel.aggregate([
        { $match: PUBLISHED },
        { $unwind: '$universities' },
        { $group: { _id: '$universities', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Hostel.find({ ...PUBLISHED, featured: true })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(6)
        .select(CARD_FIELDS)
        .lean(),
    ]);

    const totals = totalsAgg[0] || {};

    return {
      total: totals.total || 0,
      verified: totals.verified || 0,
      reviews: totals.reviews || 0,
      views: totals.views || 0,
      minPrice: totals.minPrice || 0,
      cities: cityAgg.map((row) => ({
        name: row._id,
        count: row.count,
        photo: (row.photos || []).find(Boolean) || null,
      })),
      universities: universityAgg.map((row) => ({ name: row._id, count: row.count })),
      featured: serialize(featuredDocs),
    };
  } catch (error) {
    console.error('[home] could not load listing data:', error?.message || error);
    return EMPTY;
  }
}

const STEPS = [
  {
    icon: Search,
    title: 'Search by campus, not by guesswork',
    body: 'Filter by university, city, gender and rent. Every result shows how far it sits from the campus you picked.',
  },
  {
    icon: ListChecks,
    title: 'Compare what actually matters',
    body: 'Real photos, facilities, mess menus, room types and reviews from students, laid out the same way on every listing.',
  },
  {
    icon: Handshake,
    title: 'Talk to the owner directly',
    body: 'Call or message the hostel from the listing and arrange a visit. No agent in the middle, no commission.',
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Nothing goes live unreviewed',
    body: 'Every submission is checked by a human before it appears in search: address, photos, rooms and rent all have to line up.',
  },
  {
    icon: BadgeCheck,
    title: 'The Verified badge is earned',
    body: 'It means we confirmed the hostel exists at the address given and that the listed contact answers as the owner or warden.',
  },
  {
    icon: MessageCircle,
    title: 'Reviews come from real stays',
    body: 'Ratings are written by students with an account on Hostello, and owners cannot delete a review they disagree with.',
  },
  {
    icon: Phone,
    title: 'No broker, no finder’s fee',
    body: 'Hostello never sits between you and the hostel. You contact the owner directly and pay them directly.',
  },
];

export default async function HomePage() {
  const data = await loadHomeData();

  const cityNames = data.cities.map((city) => city.name);
  const universityNames = data.universities.map((university) => university.name);
  const railUniversities = data.universities.slice(0, 12);
  const cityIndex = new Map(data.cities.map((city) => [city.name, city]));
  const shelfCities = FEATURED_CITIES.map(
    (name) => cityIndex.get(name) || { name, count: 0, photo: null }
  ).filter((city) => city.count > 0);

  const heroStats = [
    { label: 'Hostels listed', value: data.total },
    { label: 'Cities covered', value: data.cities.length },
    { label: 'Universities', value: data.universities.length },
  ];

  const trustStats = [
    { label: 'Verified listings', value: `${data.verified}/${data.total}` },
    { label: 'Student reviews', value: data.reviews },
    { label: 'Listing views', value: formatCompact(data.views) },
    { label: 'Broker fees', value: 'PKR 0' },
  ];

  return (
    <>
      {/* ══════════ Hero ══════════ */}
      <section className="relative isolate overflow-hidden border-b border-border bg-surface">
        <div
          aria-hidden="true"
          className="bg-grid pointer-events-none absolute inset-0"
          style={{
            maskImage: 'radial-gradient(70% 60% at 50% 0%, #000 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(70% 60% at 50% 0%, #000 30%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-64 left-1/2 h-128 w-256 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-accent-400/10 blur-3xl"
        />

        <Container className="relative py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
              </span>
              <span className="tabular">
                {data.total} listings live · {data.universities.length} campuses covered
              </span>
            </span>

            <h1 className="mt-6 text-display text-balance text-foreground">
              Where Pakistan’s students{' '}
              <span className="text-brand-700 dark:text-brand-300">find their room</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Compare verified hostels near NUST, FAST, QAU, COMSATS and every other major campus:
              real photos, real rents{data.minPrice ? ` from ${formatPKR(data.minPrice)} a month` : ''}, and
              reviews from students who actually lived there.
            </p>
          </div>

          <SearchBar
            cities={cityNames}
            universities={universityNames}
            className="mx-auto mt-10 max-w-5xl"
          />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="py-1.5 text-sm text-muted-foreground">Popular:</span>
            {[
              { label: 'Girls hostels in Islamabad', href: '/hostels?city=Islamabad&gender=Female' },
              { label: 'Boys hostels in Rawalpindi', href: '/hostels?city=Rawalpindi&gender=Male' },
              { label: 'Near NUST', href: '/hostels?university=NUST' },
              { label: 'Near FAST', href: '/hostels?university=FAST' },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-border-strong hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {chip.label}
              </Link>
            ))}
          </div>

          <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-border bg-border">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col bg-surface px-3 py-5 text-center sm:px-6"
              >
                <dt className="order-2 mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="tabular order-1 text-2xl font-bold text-foreground sm:text-3xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ══════════ Universities ══════════ */}
      <section className="py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="By campus"
            title="Start with your university"
            description="Every listing records the campuses it is walkable or commutable to, so you can jump straight to the shortlist that matters."
            action={
              <Button href="/hostels" variant="secondary">
                All hostels
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            }
          />
          <UniversityRail universities={railUniversities} className="mt-10" />
        </Container>
      </section>

      {/* ══════════ Featured ══════════ */}
      <section className="border-y border-border bg-surface-sunken py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="Handpicked"
            title="Featured hostels this month"
            description="Well-reviewed listings with complete photos, clear rents and owners who answer quickly."
            action={
              <Button href="/hostels?featured=true" variant="secondary">
                See all featured
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            }
          />

          {data.featured.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {data.featured.map((hostel) => (
                <HostelCard key={hostel._id} hostel={hostel} showSave />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-10 bg-surface"
              icon={Sparkles}
              title="No featured hostels yet"
              description="Nothing is highlighted right now. Browse the full directory instead."
              action={<Button href="/hostels">Browse all hostels</Button>}
            />
          )}
        </Container>
      </section>

      {/* ══════════ How it works ══════════ */}
      <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
        <Container>
          <SectionHeading
            align="center"
            eyebrow="How it works"
            title="Three steps from search to keys"
            description="Hostello is a directory, not an agency. You stay in control of who you talk to and what you pay."
          />

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex flex-col items-start">
                {/* Connector, drawn only between the tiles on wide screens. */}
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-14 right-0 top-7 hidden h-px bg-gradient-to-r from-border to-transparent md:block"
                  />
                )}

                <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-brand-700 shadow-sm dark:text-brand-300">
                  <step.icon className="size-6" aria-hidden="true" />
                  <span className="tabular absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </span>

                <h3 className="mt-5 text-h3 text-foreground">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground text-pretty">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ══════════ Cities ══════════ */}
      {shelfCities.length > 0 && (
        <section className="border-y border-border bg-surface-sunken py-16 sm:py-20 lg:py-24">
          <Container>
            <SectionHeading
              eyebrow="By city"
              title="Browse by city"
              description="Islamabad and Rawalpindi carry the bulk of the directory today, with Lahore and Karachi growing."
              action={
                <Button href="/map" variant="secondary">
                  <MapPinned className="size-4" aria-hidden="true" />
                  Open the map
                </Button>
              }
            />

            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {shelfCities.map((city) => (
                <CityCard
                  key={city.name}
                  city={city.name}
                  count={city.count}
                  photo={city.photo}
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ══════════ Trust ══════════ */}
      <section className="py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="Trust & safety"
                title="Why a listing here is worth believing"
                description="Student housing runs on WhatsApp forwards and outdated Facebook posts. Hostello exists because that is a bad way to choose where you live."
              />

              <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-border bg-border">
                {trustStats.map((stat) => (
                  <div key={stat.label} className="flex flex-col bg-surface p-5">
                    <dt className="order-2 mt-1 text-sm text-muted-foreground">{stat.label}</dt>
                    <dd className="tabular order-1 text-2xl font-bold text-foreground">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {TRUST_POINTS.map((point) => (
                <li
                  key={point.title}
                  className="flex gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    <point.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {point.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ══════════ Owner CTA ══════════ */}
      <section className="pb-16 sm:pb-20 lg:pb-24">
        <Container>
          <div className="relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-accent-500 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-accent-200/50 blur-3xl"
            />

            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
              <div className="lg:col-span-7">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-950/70">
                  <Building2 className="size-4" aria-hidden="true" />
                  For hostel owners
                </p>
                <h2 className="mt-3 text-h2 text-balance text-slate-950">
                  List your hostel where students are already looking
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-950/80 text-pretty">
                  Publish your rooms, rents and photos once and stay in front of students searching
                  their campus every day. Listings have already been viewed{' '}
                  <span className="tabular font-semibold text-slate-950">
                    {data.views.toLocaleString('en-PK')}
                  </span>{' '}
                  times.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
                <Button href="/owner" variant="secondary" size="lg" className="shadow-md">
                  List your hostel
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  href="/about"
                  variant="ghost"
                  size="lg"
                  className="text-slate-950 hover:bg-slate-950/10 hover:text-slate-950"
                >
                  <GraduationCap className="size-4" aria-hidden="true" />
                  How Hostello works
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
