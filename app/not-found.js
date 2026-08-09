import Link from 'next/link';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import SiteHeader from '@/components/ds/SiteHeader';
import SiteFooter from '@/components/ds/SiteFooter';
import { cn } from '@/lib/utils';
import { CITY_NAMES, campusPath, cityPath, genderCityPath } from '@/components/seo/catalog';

/**
 * The root 404, from Figma 404 95:5842 and 95:6294. The app had none, so every
 * unmatched URL fell to the framework's default page, which carries no header,
 * no footer, no tokens and no route out.
 *
 * WHY THIS PAGE RENDERS ITS OWN CHROME. A root `not-found.js` renders inside
 * the root layout, not inside `app/(public)/layout.js`, so the site header and
 * footer are not inherited. They are mounted here explicitly, signed out,
 * because a 404 is reached before any session matters.
 *
 * The links are counted, not guessed. A dead link is what brought the visitor
 * here; sending them to a second one would be the same mistake twice.
 */

const CHIP = cn(
  'ds-body-s inline-flex items-center justify-center gap-2 rounded-ds-chip px-3',
  'border border-solid border-ds-hairline bg-ds-surface-raised text-ds-cobalt',
  'transition-colors duration-150 motion-reduce:transition-none',
  'hover:border-ds-cobalt focus:outline-none'
);

/**
 * Counts for the routes offered below. A 404 must render whatever the database
 * is doing, so every figure is optional and the page drops the number rather
 * than the link when the count is unavailable.
 */
async function loadCounts() {
  try {
    await connectDB();
    const [raw] = await Hostel.aggregate([
      { $match: { status: 'published' } },
      {
        $facet: {
          total: [{ $count: 'n' }],
          cities: [{ $group: { _id: '$city', n: { $sum: 1 } } }],
          cityGender: [{ $group: { _id: { c: '$city', g: '$gender' }, n: { $sum: 1 } } }],
          campuses: [
            { $unwind: '$universities' },
            { $group: { _id: '$universities', n: { $sum: 1 } } },
            { $sort: { n: -1, _id: 1 } },
            { $limit: 2 },
          ],
        },
      },
    ]);

    const byCity = {};
    const byCityGender = {};
    for (const r of raw?.cities || []) byCity[r._id] = r.n;
    for (const r of raw?.cityGender || []) byCityGender[`${r._id.c}|${r._id.g}`] = r.n;

    return {
      total: raw?.total?.[0]?.n || 0,
      byCity,
      byCityGender,
      campuses: (raw?.campuses || []).map((r) => ({ name: r._id, n: r.n })),
    };
  } catch {
    return { total: 0, byCity: {}, byCityGender: {}, campuses: [] };
  }
}

export const metadata = {
  title: 'That page is not here',
  // A 404 that a search engine keeps in its index is a 404 nobody fixes.
  robots: { index: false, follow: true },
};

/**
 * Prerendered and refreshed hourly rather than rendered per request. A 404 is
 * where crawler noise and mistyped URLs land, so it must not put a database
 * query behind every one of them, and an hour old count on this page is not a
 * claim anybody acts on.
 */
export const revalidate = 3600;

export default async function NotFound() {
  const counts = await loadCounts();

  const cityWithMost = CITY_NAMES.filter((c) => counts.byCity[c] > 0).sort(
    (a, b) => counts.byCity[b] - counts.byCity[a]
  );
  const first = cityWithMost[0];
  const second = cityWithMost[1];

  const links = [
    {
      href: '/hostels',
      label: counts.total ? `Browse all ${counts.total} hostels` : 'Browse every hostel',
    },
    first && {
      href: genderCityPath(first, 'girls'),
      label: `Girls hostels in ${first}`,
      count: counts.byCityGender[`${first}|Female`],
    },
    second && {
      href: genderCityPath(second, 'boys'),
      label: `Boys hostels in ${second}`,
      count: counts.byCityGender[`${second}|Male`],
    },
    ...counts.campuses.map((c) => ({
      href: campusPath(c.name),
      label: `Hostels near ${c.name}`,
      count: c.n,
    })),
    first && {
      href: cityPath(first),
      label: `Student hostels in ${first}`,
      count: counts.byCity[first],
    },
    { href: '/map', label: 'Open the map' },
    { href: '/about', label: 'About Hostello' },
  ].filter(Boolean);

  return (
    <div className="flex min-h-dvh flex-col bg-ds-surface text-ds-ink">
      <SiteHeader user={null} />

      <main id="main" className="flex-1">
        <div className="mx-auto flex w-full max-w-360 flex-col gap-5 px-4 py-16 lg:px-20 lg:py-24">
          <h1 className="ds-display-xl max-w-[20ch] text-balance text-ds-ink">
            That page is not here
          </h1>

          <p className="ds-body-l max-w-[70ch] text-pretty text-ds-ink-muted">
            The link may be old, or a hostel may have been taken down. Listings come down when an
            owner closes, when a report checks out, or when we cannot confirm the address again.
          </p>

          <ul className="flex flex-wrap items-center gap-1 pt-2">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <span
                  className="inline-flex rounded-ds-chip-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt"
                  style={{ padding: 'var(--ds-focus-gap)' }}
                >
                  <Link href={l.href} className={CHIP} style={{ height: 'var(--ds-chip-h)' }}>
                    <span>{l.label}</span>
                    {typeof l.count === 'number' && l.count > 0 ? (
                      <span className="ds-mono-meta text-ds-ink-muted">{l.count}</span>
                    ) : null}
                  </Link>
                </span>
              </li>
            ))}
          </ul>

          <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">
            If you followed a link from Google to a hostel that is gone, the search that found it
            usually still has ten more like it.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
