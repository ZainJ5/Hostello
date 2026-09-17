import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import Button from '@/components/ds/Button';
import { EmptyState } from '@/components/ds/Feedback';
import Breadcrumbs from '@/components/roommates/Breadcrumbs';
import IntroInbox from '@/components/roommates/IntroInbox';
import MatchCard from '@/components/roommates/MatchCard';
import {
  canMatch,
  countCandidates,
  ensureOwnProfile,
  findMatches,
  loadIntros,
} from '@/components/roommates/query';

/**
 * Figma page/roommates-matches 96:6344 and 96:6988.
 *
 * Everybody on this page is the same gender as the caller and has answered all
 * six. Both are part of the `$match` stage in components/roommates/query.js,
 * so a candidate who fails either is never scored rather than scored and
 * hidden. Campus is not a filter: it is shown on every card and it breaks ties
 * in the order, because a page that only ever showed one campus was empty for
 * most students.
 *
 * Two honest empty states, and they are different problems:
 *
 *   - the caller has not answered. Nothing can be computed, and the fix is a
 *     link back to the six questions.
 *   - the caller has answered and nobody else has yet.
 *     Nothing is wrong and nothing is broken. The feature creates its own
 *     data, so this state empties itself as students arrive.
 */

export const metadata = {
  title: 'Students who also answered',
  robots: { index: false, follow: false },
};

export default async function RoommateMatchesPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=%2Froommates%2Fmatches');

  const me = await ensureOwnProfile(session);
  if (!me) redirect('/login?next=%2Froommates%2Fmatches');

  const ready = canMatch(me);
  const [matches, candidates, intros] = await Promise.all([
    ready ? findMatches(me) : Promise.resolve([]),
    ready ? countCandidates(me) : Promise.resolve(0),
    loadIntros(session.userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Roommates', href: '/roommates' },
            { label: 'Who fits' },
          ]}
        />

        <div className="flex flex-col gap-3">
          <h1 className="ds-display-xl text-ds-ink">Students who also answered</h1>
          <p className="ds-body-l text-ds-ink-muted">
            {ready
              ? 'Everybody here is the same gender as you and has answered all six. The order is how many of the six line up, with students at your own campus first. No number is shown, to you or to them, and nobody is told where they came in your list.'
              : 'Matching runs between students of the same gender who have both answered all six. Campus is shown on every card, and students at your own campus come first.'}
          </p>
        </div>

        <IntroInbox received={intros.received} sent={intros.sent} />

        {!ready ? (
          <EmptyState
            title={
              me.answeredCount >= 6
                ? 'Set your gender first'
                : `You have answered ${me.answeredCount} of six`
            }
            body={
              me.answeredCount >= 6
                ? 'Matching runs inside one gender, so it has to be set before anybody can be suggested. Adding your campus puts students at your own campus first.'
                : 'Nothing is computed until all six are answered. The form saves as you go, so there is nothing to lose by stopping again.'
            }
            action={<Button href="/roommates">Back to the questions</Button>}
          />
        ) : matches.length === 0 ? (
          <EmptyState
            title={
              candidates === 0
                ? 'Nobody else has answered yet'
                : 'Nobody is being suggested right now'
            }
            body={
              candidates === 0
                ? 'You are the first. This page fills itself in as other students answer the same six questions, and nothing has to be done to make that happen.'
                : 'Everybody who has answered is somebody you or they have blocked. Nothing further is suggested.'
            }
            action={<Button href="/hostels">Browse hostels meanwhile</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {matches.map((match) => (
              <li key={match.id} className="flex">
                <MatchCard match={match} className="w-full" />
              </li>
            ))}
          </ul>
        )}

        {matches.length ? (
          <div className="ds-elevated flex flex-col gap-1 rounded-ds-inner p-4">
            <p className="ds-body-m-strong text-ds-ink">
              Surnames are never shown, and neither are anybody&apos;s six answers
            </p>
            <p className="ds-body-s text-ds-ink-muted">
              The six blocks read sleep, clean, study, guests, smoke and noise, always in that
              order. A full block means you answered the same, a part block means you are one
              step apart, an empty one means you are further apart. Open a person to see which
              block is which. What they actually answered is theirs, and this site never shows
              it to you.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
