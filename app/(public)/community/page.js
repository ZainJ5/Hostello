import Link from 'next/link';

import { connectDB } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { EmptyState } from '@/components/ds/Feedback';

import Breadcrumbs from '@/components/community/Breadcrumbs';
import PostCard from '@/components/community/PostCard';
import { communityIndexData } from '@/components/community/query';

/**
 * /community : the Ask residents index.
 *
 * Every thread already has a home on its own listing. This page exists for the
 * reader who has not picked a listing yet and wants to see what residents
 * actually say when somebody asks, which is a different question from "which
 * hostel is cheapest".
 *
 * It is also the parent the other two community pages hang off in every
 * breadcrumb, so the "Also in Community" block at the bottom is navigation
 * rather than decoration.
 *
 * On day one it is empty and says so. Nothing here is seeded.
 */

export const metadata = {
  title: 'Ask residents',
  description:
    'Questions about student hostels in Pakistan, answered by the students who live in them. Water, power, the mess, safety, wifi and the owner.',
  alternates: { canonical: '/community' },
};

const ALSO = [
  {
    href: '/notice-board',
    label: 'Notice board, for people already living in a hostel',
  },
  { href: '/cohort', label: 'Students at your campus, by campus' },
  { href: '/roommates', label: 'Find a roommate, if you have not answered the six questions yet' },
];

export default async function CommunityPage() {
  await connectDB();
  const { answered, open, openCount, answeredCount } = await communityIndexData();

  const summary =
    answeredCount === 0 && openCount === 0
      ? 'Nobody has asked anything yet.'
      : `${answeredCount} ${answeredCount === 1 ? 'question' : 'questions'} answered, ${openCount} still open.`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[{ href: '/', label: 'Home' }, { label: 'Community' }]}
      />

      <h1 className="ds-display-xl text-balance text-ds-ink">Ask residents</h1>

      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        Every question here was asked about one hostel and answered by somebody living
        in it. {summary} An answer stays on the listing it belongs to, so it is still
        there for the next person who wonders the same thing.
      </p>

      {answered.length > 0 ? (
        <section className="mt-10">
          <h2 className="ds-display-m border-b border-solid border-ds-ink pb-2 text-ds-ink">
            Recently answered
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {answered.map((thread) => {
              const top = thread.answers[0];
              return (
                <li key={thread.id}>
                  <PostCard
                    tag={thread.hostelName}
                    title={thread.question}
                    href={thread.href}
                    body={top?.body}
                    meta={top?.author}
                    time={top?.createdAt ? `answered ${timeAgo(top.createdAt)}` : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {open.length > 0 ? (
        <section className="mt-10">
          <h2 className="ds-display-m border-b border-solid border-ds-ink pb-2 text-ds-ink">
            Waiting for a resident
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {open.map((thread) => (
              <li key={thread.id}>
                <PostCard
                  tag={thread.hostelName}
                  title={thread.question}
                  href={thread.href}
                  meta={`asked ${timeAgo(thread.createdAt)}`}
                  time={
                    thread.nudgeCount > 0
                      ? `${thread.nudgeCount} ${thread.nudgeCount === 1 ? 'nudge' : 'nudges'}`
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {answered.length === 0 && open.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Nobody has asked anything yet"
          body="This page is a list of real questions about real buildings, so it starts empty and fills up as students use it. Open any listing and ask the thing you actually want to know."
          action={<Button href="/hostels">Browse hostels</Button>}
        />
      ) : null}

      <section className="mt-12 border-t border-solid border-ds-hairline pt-6">
        <h2 className="ds-display-s text-ds-ink">Also in Community</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {ALSO.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="ds-body-m ds-tap ds-focusable inline-flex items-center text-ds-cobalt underline-offset-2 hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
