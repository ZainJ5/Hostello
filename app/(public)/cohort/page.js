import Link from 'next/link';

import { connectDB } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { EmptyState } from '@/components/ds/Feedback';
import Button from '@/components/ds/Button';

import Breadcrumbs from '@/components/community/Breadcrumbs';
import { campusList } from '@/components/community/query';

/**
 * /cohort : pick a campus.
 *
 * The campuses come from the listings, not from a hand written list, so a
 * campus appears here the moment a hostel near it is published and disappears
 * when the last one goes. Eighteen of them today.
 */

export const metadata = {
  title: 'Students by campus',
  description:
    'Students at each campus who have answered a question or written a review on Hostello.',
  // Aggregating one person's public activity into a per campus list is a new
  // disclosure even though every item in it is already public, so it is kept
  // out of search results.
  robots: { index: false, follow: true },
};

export default async function CohortIndex() {
  await connectDB();
  const campuses = await campusList();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
          { label: 'By campus' },
        ]}
      />

      <h1 className="ds-display-xl text-balance text-ds-ink">Students by campus</h1>

      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        Two students going to look at the same hostel together is how this decision
        usually gets made. Pick your campus and see who else is already talking about
        the hostels near it.
      </p>

      {campuses.length > 0 ? (
        <ul className="mt-8 grid gap-2 sm:grid-cols-2">
          {campuses.map((c) => (
            <li key={c.name}>
              <Link
                href={`/cohort/${slugify(c.name)}`}
                className="ds-elevated ds-focusable flex items-baseline justify-between gap-3 rounded-ds-inner p-4 hover:border-ds-cobalt"
              >
                <span className="ds-body-m-strong text-ds-ink">{c.name}</span>
                <span className="ds-mono-meta shrink-0 text-ds-ink-muted">
                  {c.listings} {c.listings === 1 ? 'hostel' : 'hostels'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          title="No campuses yet"
          body="Campuses come from the published listings, so this fills in as the directory does."
          action={<Button href="/hostels">Browse hostels</Button>}
        />
      )}
    </div>
  );
}
