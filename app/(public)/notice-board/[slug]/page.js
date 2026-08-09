import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Button from '@/components/ds/Button';
import FilterChip from '@/components/ds/FilterChip';
import { Alert, EmptyState } from '@/components/ds/Feedback';

import Breadcrumbs from '@/components/community/Breadcrumbs';
import NoticeComposer from '@/components/community/NoticeComposer';
import PostCard from '@/components/community/PostCard';
import RemoveNoticeButton from '@/components/community/RemoveNoticeButton';
import ReportButton from '@/components/community/ReportButton';
import { NOTICE_FILTERS } from '@/components/community/notice-types';
import { boardForHostel, publishedHostel } from '@/components/community/query';
import { livesAt } from '@/components/community/residency';

/**
 * /notice-board/[slug] : one hostel's board.
 *
 * Behind auth and behind residency, and never indexed. The board carries room
 * numbers, the times people leave the building and what they are selling out
 * of their room, which is exactly the set of facts that should not be
 * available to somebody who does not live there. `robots: noindex, nofollow`
 * is the belt; the residency check is the braces, and it runs on the server
 * before anything is read.
 *
 * The board empties itself. That is a TTL index on `expiresAt` in the model,
 * not a cron, and the read below also filters on the date because Mongo's TTL
 * monitor only sweeps about once a minute.
 */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await connectDB();
  const hostel = await publishedHostel(slug);
  return {
    title: hostel ? `Notice board, ${hostel.name}` : 'Notice board',
    robots: { index: false, follow: false },
  };
}

export default async function BoardPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const type = NOTICE_FILTERS.some((f) => f.value && f.value === sp?.type) ? sp.type : '';

  await connectDB();
  const hostel = await publishedHostel(slug);
  if (!hostel) notFound();

  const session = await getSession();

  const shell = (children) => (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
          { href: '/notice-board', label: 'Notice board' },
          { label: hostel.name },
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
          {hostel.name}. Only residents can read or post on this board, so it starts
          with signing in.
        </p>
        <div className="mt-6 flex">
          <Button href={`/login?next=${encodeURIComponent(`/notice-board/${hostel.slug}`)}`}>
            Sign in
          </Button>
        </div>
      </>
    );
  }

  const resident =
    session.role === 'student' ? await livesAt(session.userId, hostel._id) : false;

  if (!resident) {
    return shell(
      <>
        <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
          {hostel.name}. Only residents and the warden can post or read this board.
        </p>
        <Alert tone="error" title="Hostello has no record of you living here" className="mt-6">
          The board opens once a booking on {hostel.name} is confirmed, which is the
          same check that lets you write a review. If you do live here and the booking
          was made another way, the owner can confirm it and the board opens.
        </Alert>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button href={`/hostels/${hostel.slug}`} variant="secondary">
            Back to the listing
          </Button>
        </div>
      </>
    );
  }

  const { notices, counts, total } = await boardForHostel(hostel._id, type);

  return shell(
    <>
      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        {hostel.name}. Only residents and the warden can post or read this board, and
        Hostello checked that you live here before letting you in.
      </p>

      <div className="mt-6 flex flex-wrap gap-1">
        {NOTICE_FILTERS.map((f) => (
          <FilterChip
            key={f.value || 'all'}
            href={f.value ? `/notice-board/${hostel.slug}?type=${f.value}` : `/notice-board/${hostel.slug}`}
            selected={type === f.value}
            count={f.value ? counts[f.value] || 0 : total}
          >
            {f.label}
          </FilterChip>
        ))}
      </div>

      {notices.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {notices.map((n) => {
            const mine = n.authorId === session.userId;
            return (
              <li key={n.id}>
                <PostCard
                  tag={n.badge}
                  title={n.headline}
                  body={n.detail}
                  meta={[n.author, n.room ? `Room ${n.room}` : null].filter(Boolean).join(', ')}
                  time={n.expiryLabel}
                  actions={
                    mine ? (
                      <RemoveNoticeButton noticeId={n.id} />
                    ) : (
                      <ReportButton endpoint={`/api/community/notices/${n.id}/flag`} />
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          className="mt-6"
          title={type ? 'Nothing of that kind right now' : 'Nothing is on the board'}
          body={
            type
              ? 'Every post here expires on its own, so a filter with nothing under it usually means nothing is going on rather than that something is broken.'
              : 'An empty board means nothing is going on, not that something is broken. Everything here clears itself, so this is what a quiet week looks like.'
          }
        />
      )}

      <Alert title="Everything here clears itself" className="mt-6">
        A ride goes two hours after it leaves, a mess notice goes at midnight, a room
        goes on the date it comes free, anything for sale goes after two weeks, and a
        request for a hand goes at the end of the day you needed it. Nothing has to be
        tidied up by anybody.
      </Alert>

      <div className="mt-6">
        <NoticeComposer hostelSlug={hostel.slug} />
      </div>
    </>
  );
}
