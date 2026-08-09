import Link from 'next/link';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { Alert, EmptyState } from '@/components/ds/Feedback';
import { CAMPUS_NAMES } from '@/components/seo/catalog';

import CompareControls from '@/components/compare/CompareControls';
import CompareTable from '@/components/compare/CompareTable';
import { ABSENT_NOTE, buildRows, chooseCampus } from '@/components/compare/rows';
import { MAX_COMPARE, parseSelection } from '@/components/compare/selection';

/**
 * `/compare` : compare 98:7699 and 98:7981.
 *
 * The comparison is entirely in the URL, so it renders on the server and a
 * link to it reproduces it exactly. That is what the frame's second call to
 * action, "send all three to your family", actually needs, and it is why the
 * client bundle here is three controls and nothing else.
 *
 * DIVERGENCE: the frame's single "Contact the owner" button. Three columns
 * means three owners, so there is nothing for one button to do. Each column
 * carries its own enquiry link instead, and the sharing action becomes "copy
 * this comparison", which is the thing that is actually being sent.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const DESCRIPTION =
  'Put up to four hostels side by side on rent, area, who can stay, facilities, the verified badge ' +
  'and straight line distance to a campus. The comparison lives in the link, so it can be shared.';

const FIELDS =
  'slug name city area universities gender price priceMin priceMax rating reviewCount ' +
  'facilities verified lat lng contact';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const selection = parseSelection(await searchParams);

  return {
    title: 'Compare hostels',
    description: DESCRIPTION,
    // A specific comparison is one student's working state and never the
    // canonical resource, so every variant points at the empty page and is
    // followed rather than indexed. The empty page itself is worth indexing.
    alternates: { canonical: '/compare' },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/compare`,
      title: 'Compare hostels | Hostello',
      description: DESCRIPTION,
    },
    twitter: { card: 'summary_large_image', title: 'Compare hostels', description: DESCRIPTION },
    ...(selection.slugs.length ? { robots: { index: false, follow: true } } : {}),
  };
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four'];

async function loadHostels(slugs) {
  if (!slugs.length) return [];
  const rows = await Hostel.find({ slug: { $in: slugs }, status: 'published' }, FIELDS).lean();
  const bySlug = new Map(serialize(rows).map((h) => [h.slug, h]));
  // Column order follows the URL, not the database, so a shared link always
  // puts the columns where the sender saw them.
  return slugs.map((s) => bySlug.get(s)).filter(Boolean);
}

export default async function ComparePage({ searchParams }) {
  const selection = parseSelection(await searchParams);

  await connectDB();
  const [hostels, options] = await Promise.all([
    loadHostels(selection.slugs),
    Hostel.find({ status: 'published' }, 'slug name city')
      .sort({ city: 1, name: 1 })
      .lean()
      .then(serialize),
  ]);

  const campusName = chooseCampus(hostels, selection.campus);
  const rows = hostels.length ? buildRows(hostels, campusName) : [];
  const missing = selection.slugs.length - hostels.length;

  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-6 px-4 pb-20 pt-8 lg:px-20">
      <nav aria-label="Breadcrumb">
        <ol className="ds-body-s flex items-center gap-2 text-ds-ink-muted">
          <li>
            <Link
              href="/"
              className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/hostels"
              className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              Browse hostels
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ds-ink">
            Compare
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3">
        <h1 className="ds-display-m text-balance text-ds-ink">
          {hostels.length
            ? `Compare ${COUNT_WORDS[hostels.length] || hostels.length} ${hostels.length === 1 ? 'hostel' : 'hostels'}`
            : 'Compare hostels'}
        </h1>
        <p className="ds-body-l max-w-[95ch] text-pretty text-ds-ink-muted">
          The same rows in the same order for every hostel, so an empty cell means the owner did not
          fill it in rather than that the hostel does not have it.
        </p>
      </div>

      <CompareControls selection={selection} options={options} campuses={CAMPUS_NAMES} />

      {missing > 0 ? (
        <Alert tone="error" title={`${missing} of the links could not be opened`}>
          {missing === 1 ? 'One hostel' : `${missing} hostels`} in this comparison is no longer
          published, or the link has a typo in it. The rest of the comparison is below.
        </Alert>
      ) : null}

      {hostels.length >= 2 ? (
        <>
          <CompareTable hostels={hostels} rows={rows} selection={selection} />

          <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">{ABSENT_NOTE}</p>

          {/* One owner per column, so one enquiry per column. */}
          <div className="flex flex-col gap-3">
            <h2 className="ds-body-m-strong text-ds-ink">Send an enquiry</h2>
            <div className="flex flex-wrap gap-1">
              {hostels.map((h) => (
                <Button key={h.slug} href={`/hostels/${h.slug}/enquire`} variant="secondary">
                  {h.name}
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : hostels.length === 1 ? (
        <EmptyState
          title="Add one more to compare"
          body={`${hostels[0].name} is in the comparison. A table of one column is just the listing page, so add at least one more hostel above. Up to ${MAX_COMPARE} fit.`}
          action={<Button href={`/hostels/${hostels[0].slug}`}>Open {hostels[0].name}</Button>}
        />
      ) : (
        <EmptyState
          title="Nothing to compare yet"
          body={`Pick hostels above, or browse the directory and come back with a shortlist. Up to ${MAX_COMPARE} fit side by side, and the comparison lives in the link, so it can be shared.`}
          action={<Button href="/hostels">Browse hostels</Button>}
        />
      )}
    </div>
  );
}
