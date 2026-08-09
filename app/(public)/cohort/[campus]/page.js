import Link from 'next/link';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { slugify } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { Alert, EmptyState } from '@/components/ds/Feedback';

import Avatar from '@/components/community/Avatar';
import Breadcrumbs from '@/components/community/Breadcrumbs';
import { campusList, cohortRoster } from '@/components/community/query';

/**
 * /cohort/[campus]
 *
 * WHAT THIS PAGE IS NOT. The frame draws a roster grouped by intake, where
 * every card carries a year, a programme, a budget, the areas somebody is
 * looking in and a six segment compatibility strip. None of that was buildable
 * here and it is worth being precise about why rather than shipping a thinner
 * version quietly:
 *
 *   intake, year, programme, budget, areas
 *     No field on `User` holds any of them and `models/User.js` is frozen for
 *     this work. Deriving an intake from the date an account was created would
 *     be inventing data, which is the one thing this codebase has already been
 *     caught doing five times.
 *
 *   the compatibility strip
 *     It compares two students' answers to the six roommate questions. Those
 *     answers are never readable by another student, and this work is not
 *     permitted to query `RoommateProfile` at all. The strip is absent rather
 *     than approximated.
 *
 * So the roster shows what the product genuinely knows: students at this
 * campus who have already published something under their name. Nobody is
 * listed for having typed a university into their account, because that is not
 * consent to appear on a page.
 */

async function resolveCampus(slug) {
  const campuses = await campusList();
  return campuses.find((c) => slugify(c.name) === String(slug || '').toLowerCase()) || null;
}

export async function generateMetadata({ params }) {
  const { campus } = await params;
  await connectDB();
  const found = await resolveCampus(campus);
  return {
    title: found ? `Students at ${found.name}` : 'Students by campus',
    robots: { index: false, follow: true },
  };
}

export default async function CohortPage({ params }) {
  const { campus } = await params;

  await connectDB();
  const found = await resolveCampus(campus);
  if (!found) notFound();

  const roster = await cohortRoster(found.name);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
          { href: '/cohort', label: 'By campus' },
          { label: found.name },
        ]}
      />

      <h1 className="ds-display-xl text-balance text-ds-ink">
        Students at {found.name}
      </h1>

      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        {roster.length === 0
          ? `Nobody at ${found.name} has answered a question or written a review yet, so there is nobody to list.`
          : `${roster.length} ${roster.length === 1 ? 'student has' : 'students have'} answered a question or written a review about the ${found.listings} ${found.listings === 1 ? 'hostel' : 'hostels'} near ${found.name}.`}{' '}
        Everybody here put their name to something in public first. Nobody appears
        because they filled in a university on their account.
      </p>

      {roster.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {roster.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}`}
                className="ds-elevated ds-focusable flex items-center gap-3 rounded-ds-inner p-4 hover:border-ds-cobalt"
              >
                <Avatar name={s.name} />
                <span className="flex min-w-px flex-col">
                  <span className="ds-body-m-strong text-ds-ink">{s.name}</span>
                  <span className="ds-body-s text-ds-ink-muted">
                    {[
                      s.answers
                        ? `${s.answers} ${s.answers === 1 ? 'answer' : 'answers'}`
                        : null,
                      s.reviews
                        ? `${s.reviews} ${s.reviews === 1 ? 'review' : 'reviews'}`
                        : null,
                      s.city || null,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          title="Nobody is on this page yet"
          body="It fills up from the first answer. Somebody living in a hostel near this campus answers a question, and they appear here with a profile that shows what they have written and nothing else."
          action={<Button href="/hostels">Browse hostels near campus</Button>}
        />
      )}

      <Alert title="What this page is for" className="mt-8">
        Two students going to look at the same hostel together is how this decision
        usually gets made. That is the only thing this list is for, and it does not do
        anything else.
      </Alert>

      <section className="mt-10 border-t border-solid border-ds-hairline pt-6">
        <h2 className="ds-display-s text-ds-ink">Also in Community</h2>
        <ul className="mt-3 flex flex-col gap-2">
          <li>
            <Link
              href="/notice-board"
              className="ds-body-m ds-tap ds-focusable inline-flex items-center text-ds-cobalt underline-offset-2 hover:underline"
            >
              Notice board, for people already living in a hostel
            </Link>
          </li>
          <li>
            <Link
              href="/community"
              className="ds-body-m ds-tap ds-focusable inline-flex items-center text-ds-cobalt underline-offset-2 hover:underline"
            >
              Ask residents, on any listing you are looking at
            </Link>
          </li>
          <li>
            <Link
              href="/roommates"
              className="ds-body-m ds-tap ds-focusable inline-flex items-center text-ds-cobalt underline-offset-2 hover:underline"
            >
              Find a roommate, if you have not answered the six questions yet
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
