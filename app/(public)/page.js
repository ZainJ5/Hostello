import Image from 'next/image';
import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { cn, serialize } from '@/lib/utils';

import { TITLE } from '@/components/public/type';
import Container from '@/components/public/Container';
import SearchBar from '@/components/public/SearchBar';
import SectionHeading from '@/components/public/SectionHeading';
import UniversityRail from '@/components/public/UniversityRail';
import CityCard from '@/components/public/CityCard';

import Button from '@/components/ds/Button';
import FilterChip from '@/components/ds/FilterChip';
import HostelCard from '@/components/ds/HostelCard';
import { CARD_PROJECTION } from '@/components/hostels/query';
import { cardCampus } from '@/components/hostels/campus-distance';

export const dynamic = 'force-dynamic';

const PUBLISHED = { status: 'published' };

/** The four markets the directory actually covers, in the order they matter. */
const FEATURED_CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

const EMPTY = { total: 0, cities: [], universities: [], checked: [] };

/**
 * Everything the page needs, in three round trips. A Mongo outage degrades the
 * page to its static copy rather than throwing a 500 at a visitor.
 *
 * The listing shelf asks for verified listings that carry the owner's own
 * photographs, because the section says the pictures come from the owner and
 * the query has to make that true. 51 of the 124 listings still fall back to
 * the stock URLs the import wrote, and they are not shown here.
 */
async function loadHomeData() {
  try {
    await connectDB();

    const [totals, cityAgg, universityAgg, checkedDocs] = await Promise.all([
      Hostel.countDocuments(PUBLISHED),
      Hostel.aggregate([
        { $match: PUBLISHED },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Hostel.aggregate([
        { $match: PUBLISHED },
        { $unwind: '$universities' },
        { $group: { _id: '$universities', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Hostel.find(
        {
          ...PUBLISHED,
          verified: true,
          images: { $elemMatch: { $regex: '^/uploads' } },
        },
        CARD_PROJECTION
      )
        .sort({ featured: -1, rating: -1, reviewCount: -1, _id: 1 })
        .limit(3)
        .lean(),
    ]);

    return {
      total: totals || 0,
      cities: cityAgg.map((row) => ({ name: row._id, count: row.count })),
      universities: universityAgg.map((row) => ({ name: row._id, count: row.count })),
      checked: serialize(checkedDocs),
    };
  } catch (error) {
    console.error('[home] could not load listing data:', error?.message || error);
    return EMPTY;
  }
}

const STEPS = [
  {
    title: 'Search by campus, not by guesswork',
    body: 'Filter by university, city, who can stay and rent. Every result shows how far it sits from the campus you picked, measured in a straight line and labelled as one.',
  },
  {
    title: 'Compare what actually matters',
    body: 'Photos, what is included, the rent band and the distance to your campus, laid out the same way on every listing so two hostels can be read side by side.',
  },
  {
    title: 'Talk to the owner yourself',
    body: 'Call or message the hostel from the listing and arrange a visit. Hostello holds no rooms, takes no commission and never sits in the middle.',
  },
];

/** Alternating surface and sunken bands, exactly as the frame stacks them. */
function Band({ sunken = false, className, children }) {
  return (
    <section className={cn(sunken ? 'bg-ds-surface-sunken' : 'bg-ds-surface', className)}>
      <Container className="flex flex-col gap-5 py-12">{children}</Container>
    </section>
  );
}

export const metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

export default async function HomePage() {
  const data = await loadHomeData();

  const cityIndex = new Map(data.cities.map((c) => [c.name, c]));
  const shelfCities = FEATURED_CITIES.map((name) => cityIndex.get(name) || { name, count: 0 })
    .filter((c) => c.count > 0);

  const popular = [
    { label: 'Girls hostels in Islamabad', href: '/hostels?city=Islamabad&gender=Female' },
    { label: 'Boys hostels in Rawalpindi', href: '/hostels?city=Rawalpindi&gender=Male' },
    { label: 'Near NUST', href: '/hostels?university=NUST' },
    { label: 'Near FAST', href: '/hostels?university=FAST' },
  ];

  return (
    <>
      {/* ══ Hero ══ */}
      <section className="bg-ds-surface">
        <Container className="py-14">
          {/*
            Two columns from lg, matching the frame, which pairs the search
            column with the shared room illustration. Below lg the illustration
            drops rather than shrinking to a stripe: at 390 the search is the
            whole job of this screen.
          */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
            <div className="flex max-w-165 flex-col gap-7 lg:flex-1">
              <h1 className={cn(TITLE, 'text-balance text-ds-ink')}>
                Where Pakistan&apos;s students find their room
              </h1>

              <p className="ds-body-l text-pretty text-ds-ink-muted">
                {data.total} hostels near {data.universities.length} campuses in Islamabad,
                Rawalpindi, Lahore and Karachi. Every listing is read by a person before it goes
                live. You contact the owner yourself, and Hostello takes nothing from either side.
              </p>

              <SearchBar universities={data.universities} />

              <ul className="flex flex-wrap gap-1">
                {popular.map((chip) => (
                  <li key={chip.href}>
                    <FilterChip href={chip.href}>{chip.label}</FilterChip>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden lg:block lg:w-104 xl:w-120">
              <Image
                src="/illustrations/hero-shared-room.svg"
                alt="The inside of a shared student room, with two beds, two desks and a window"
                width={1024}
                height={1024}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ══ By campus ══ */}
      <Band sunken>
        <SectionHeading
          title="Start with your campus"
          description="Every listing records the campuses it can be reached from, so the distance you see is measured from the one you picked rather than from the middle of the city."
        />
        <UniversityRail universities={data.universities.slice(0, 12)} />
      </Band>

      {/* ══ By city ══ */}
      {shelfCities.length ? (
        <Band>
          <SectionHeading
            title="Browse by city"
            description="Islamabad and Rawalpindi carry the directory today. Lahore and Karachi are thin and the counts say so rather than hiding it."
          />
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {shelfCities.map((city) => (
              <li key={city.name}>
                <CityCard city={city.name} count={city.count} />
              </li>
            ))}
          </ul>
        </Band>
      ) : null}

      {/* ══ Checked listings ══ */}
      {data.checked.length ? (
        <Band sunken>
          <SectionHeading
            title="Checked by a person"
            description="Verified listings whose photographs came from the owner rather than from stock. Nothing here is retouched, so photo quality varies and it is not a ranking signal."
          />
          <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {data.checked.map((hostel, i) => (
              <li key={hostel._id} className="min-w-px">
                <HostelCard hostel={hostel} campus={cardCampus(hostel)} priority={i === 0} />
              </li>
            ))}
          </ul>
          <Button href="/hostels" variant="secondary" className="w-full">
            See all {data.total} hostels
          </Button>
        </Band>
      ) : null}

      {/* ══ How it works ══ */}
      <Band>
        <SectionHeading title="A directory, not an agency" />
        <ol className="grid gap-3 lg:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.title} className="ds-elevated flex flex-col gap-2 rounded-ds-inner p-4">
              <h3 className="ds-body-m-strong text-ds-ink">{step.title}</h3>
              <p className="ds-body-s text-pretty text-ds-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      {/* ══ Roommates ══ */}
      <Band sunken>
        <SectionHeading
          title="Know your roommate before you move in"
          description="We ask six things about how you actually live: when you sleep, how often you tidy, where you study, whether friends come over, whether anyone smokes, and how much noise is alright after eleven. Everybody answers the same six, so two answers can be put side by side."
        />
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
          <div className="flex flex-col gap-7 lg:flex-1">
            <p className="ds-body-m max-w-[100ch] text-pretty text-ds-ink-muted">
              Matching runs only inside your own campus and your own gender, and Hostello never
              places anybody in a room. It produces an introduction, and the person on the other
              end accepts it or ignores it.
            </p>
            <div>
              <Button href="/roommates">Answer the six questions</Button>
            </div>
          </div>

          <div className="lg:w-96 xl:w-104">
            <Image
              src="/illustrations/find-a-roommate.svg"
              alt="Two students seen from behind, sitting together and looking at a shared room"
              width={1024}
              height={1024}
              className="h-auto w-full"
            />
          </div>
        </div>

        {/*
          A shair, set in Nastaliq. `dir` and `lang` are on the element rather
          than the page: the rest of the document is left to right, and without
          them the comma lands on the wrong side of the line. `.ds-label-urdu`
          carries the 2.22 line height Nastaliq needs so its descenders are not
          clipped, which is the reason the design gives it its own text style.
        */}
        <figure className="mt-2 flex flex-col items-center gap-4 border-t border-solid border-ds-hairline pt-10">
          <blockquote dir="rtl" lang="ur" className="ds-label-urdu text-center text-ds-ink">
            <p>باتوں باتوں میں گزر جائے گا یہ سفر</p>
            <p>منزل کی فِکر کرنا، یہ کام دوستوں کا ہے</p>
          </blockquote>
        </figure>
      </Band>

      {/* ══ Ask residents ══ */}
      <Band>
        <SectionHeading
          title="Ask someone who already lives there"
          description="Most students still choose a hostel from a WhatsApp forward, or from a cousin who studied there two years ago. On Hostello anyone can ask a question on a listing, and only the people currently living there can answer it."
        />
        <p className="ds-body-m max-w-[100ch] text-pretty text-ds-ink-muted">
          Water pressure on the top floor, whether the backup power actually runs the room, and
          what the mess does on a Sunday are the three that catch people out, and none of them
          appear on any listing anywhere.
        </p>
        <div>
          <Button href="/community" variant="secondary">
            Read what residents are answering
          </Button>
        </div>
      </Band>

      {/* ══ For owners ══ */}
      <Band sunken>
        <SectionHeading
          title="List your hostel where students are already searching"
          description="Publish your rooms, rents and photos once. Owners pay a flat fee to be listed and students pay nothing at all."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button href="/list-your-hostel">List your hostel</Button>
          <Button href="/about" variant="secondary">
            How Hostello works
          </Button>
        </div>
      </Band>
    </>
  );
}
