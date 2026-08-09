import Link from 'next/link';
import Button from '@/components/ds/Button';
import { Alert, EmptyState } from '@/components/ds/Feedback';
import AccountPage from '@/components/student/AccountPage';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import { requireStudentUser } from '../_lib/session';
import { SAVED_ROW_FIELDS, savedRowMeta } from '../_lib/rows';

export const metadata = { title: 'Overview' };

/**
 * The account index.
 *
 * The design file has no frame for this route, which is a gap in the file
 * rather than permission to delete a working page: every other account frame
 * carries a breadcrumb whose middle crumb is "Account", so the file expects
 * this page to exist. It is composed entirely from what is already built, the
 * ds primitives plus the compact saved row the account-saved frame draws, and
 * introduces no new pattern.
 *
 * NO ZERO COUNTERS. `Review` and `Booking` are both empty on a fresh
 * production database, so a figure on those rows would read 0 on day one for
 * every student. Each row renders a figure only when there is something to
 * count and a sentence when there is not, which is the same rule the rest of
 * the site follows about absent data.
 *
 * The previous version of this page also carried a "Recommended for you"
 * shelf. It is gone, along with `_lib/recommendations.js`: the account area is
 * the record of what you have done, browse is where listings are chosen, and
 * the header carries Browse hostels on every page of the site.
 */
export default async function AccountOverviewPage() {
  const { user } = await requireStudentUser('/account');
  await connectDB();

  const studentId = user._id;
  const savedIds = (user.savedHostels || []).map(String);

  const [enquiryCount, reviewCount, savedHostels] = await Promise.all([
    Booking.countDocuments({ studentId }),
    Review.countDocuments({ studentId }),
    savedIds.length
      ? Hostel.find({ _id: { $in: savedIds }, status: 'published' })
          .select(SAVED_ROW_FIELDS)
          .lean()
      : [],
  ]);

  // `savedHostels` is append-ordered, so reversing gives most-recent-first.
  const order = new Map(savedIds.map((id, i) => [id, i]));
  const saved = [...savedHostels].sort(
    (a, b) => order.get(String(b._id)) - order.get(String(a._id))
  );

  const firstName = String(user.name || '').split(' ')[0] || 'there';

  const rows = [
    {
      label: 'Saved hostels',
      count: saved.length,
      empty: 'Nothing saved yet',
      href: '/account/saved',
      cta: 'Open your shortlist',
    },
    {
      label: 'Enquiries sent',
      count: enquiryCount,
      empty: 'None sent yet',
      href: '/account/enquiries',
      cta: 'See who you contacted',
    },
    {
      label: 'Reviews written',
      count: reviewCount,
      empty: 'None written yet',
      href: '/account/reviews',
      cta: 'Write or edit a review',
    },
  ];

  return (
    <AccountPage
      title={`Hello, ${firstName}`}
      lead="Your shortlist, the owners you have contacted and the reviews you have left. Nothing here is visible to a hostel owner unless you contacted them."
    >
      <div className="flex flex-col gap-8">
        {!user.university ? (
          <Alert title="Set your university">
            Every distance on the site is measured from your campus, and without one the
            saved list cannot say how far anything is.{' '}
            <Link
              href="/account/profile"
              className="text-ds-cobalt underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              Add it to your profile
            </Link>
            .
          </Alert>
        ) : null}

        <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
          <h2 id="activity-heading" className="ds-display-m text-ds-ink">
            Where you are up to
          </h2>
          <ul className="ds-elevated flex flex-col rounded-ds-inner">
            {rows.map((row, i) => (
              <li
                key={row.label}
                className={
                  i > 0
                    ? 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-solid border-ds-hairline p-4'
                    : 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4'
                }
              >
                <div className="min-w-0">
                  <p className="ds-body-m-strong text-ds-ink">{row.label}</p>
                  {row.count > 0 ? (
                    <p className="ds-figure-l text-ds-ink">{row.count}</p>
                  ) : (
                    <p className="ds-body-s text-ds-ink-muted">{row.empty}</p>
                  )}
                </div>
                <Link
                  href={row.href}
                  className="ds-body-m ds-tap inline-flex items-center rounded-ds-inner text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt"
                >
                  {row.cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="saved-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h2 id="saved-heading" className="ds-display-m text-ds-ink">
              Your shortlist
            </h2>
            {saved.length > 3 ? (
              <Link
                href="/account/saved"
                className="ds-body-m ds-tap inline-flex items-center rounded-ds-inner text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                All {saved.length} saved
              </Link>
            ) : null}
          </div>

          {saved.length === 0 ? (
            <EmptyState
              title="Nothing saved yet"
              body="Save a hostel from its listing and it waits here while you compare. Saving tells the owner nothing and holds no room."
              action={<Button href="/hostels">Browse hostels</Button>}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {saved.slice(0, 3).map((hostel) => {
                const meta = savedRowMeta(hostel, user.university);
                return (
                  <li
                    key={String(hostel._id)}
                    className="ds-elevated flex flex-col gap-1 rounded-ds-inner p-4"
                  >
                    <h3 className="ds-display-s text-ds-ink">
                      <Link
                        href={`/hostels/${hostel.slug}`}
                        className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                      >
                        {hostel.name}
                      </Link>
                    </h3>
                    {meta ? <p className="ds-body-s text-ds-ink-muted">{meta}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AccountPage>
  );
}
