import Link from 'next/link';
import { redirect } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Hostel from '@/models/Hostel';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';

import Breadcrumbs from '@/components/community/Breadcrumbs';
import { residentHostelIds } from '@/components/community/residency';

/**
 * /notice-board : the door to your own board.
 *
 * A board belongs to a building, not to the site, so this route resolves which
 * one you are entitled to read and gets out of the way. One hostel and it
 * redirects; more than one and it asks; none and it says why rather than
 * showing an empty board that is not yours.
 *
 * The footer links here rather than to a slug, because nobody knows their own
 * hostel's slug and it can change.
 */

export const metadata = {
  title: 'Notice board',
  robots: { index: false, follow: false },
};

export default async function NoticeBoardIndex() {
  const session = await getSession();

  const shell = (children) => (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
          { label: 'Notice board' },
        ]}
      />
      <h1 className="ds-display-xl text-balance text-ds-ink">Notice board</h1>
      {children}
    </div>
  );

  if (!session) {
    return shell(
      <>
        <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
          Every hostel on Hostello has a board that only the people living in it can
          read. Rides to campus, a bed coming free, a kettle for sale, the mess being
          off tonight.
        </p>
        <div className="mt-6 flex">
          <Button href={`/login?next=${encodeURIComponent('/notice-board')}`}>Sign in</Button>
        </div>
      </>
    );
  }

  await connectDB();
  const ids = session.role === 'student' ? await residentHostelIds(session.userId) : [];

  if (ids.length === 1) {
    const only = await Hostel.findById(ids[0]).select('slug').lean();
    if (only?.slug) redirect(`/notice-board/${only.slug}`);
  }

  const hostels =
    ids.length > 1
      ? await Hostel.find({ _id: { $in: ids } }).select('name slug city').sort({ name: 1 }).lean()
      : [];

  if (hostels.length > 1) {
    return shell(
      <>
        <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
          You have a confirmed booking at more than one hostel, so pick the board you
          want.
        </p>
        <ul className="mt-6 flex flex-col gap-2">
          {hostels.map((h) => (
            <li key={String(h._id)}>
              <Link
                href={`/notice-board/${h.slug}`}
                className="ds-elevated ds-focusable flex flex-col gap-0.5 rounded-ds-inner p-4 hover:border-ds-cobalt"
              >
                <span className="ds-body-m-strong text-ds-ink">{h.name}</span>
                <span className="ds-body-s text-ds-ink-muted">{h.city}</span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return shell(
    <>
      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        Every hostel on Hostello has a board that only the people living in it can
        read.
      </p>
      <Alert title="You do not have a board yet" className="mt-6">
        A board opens when a booking is confirmed by the owner, which is the same
        check that lets you write a review. Until then there is nothing here that
        belongs to you, and showing somebody else&apos;s board would defeat the point
        of it being private.
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button href="/hostels">Browse hostels</Button>
        <Button href="/community" variant="secondary">
          Ask residents instead
        </Button>
      </div>
    </>
  );
}
