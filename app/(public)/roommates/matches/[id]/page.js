import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import Badge from '@/components/ds/Badge';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import Avatar from '@/components/roommates/Avatar';
import Breadcrumbs from '@/components/roommates/Breadcrumbs';
import MetaStrip from '@/components/roommates/MetaStrip';
import {
  ensureOwnProfile,
  findMatch,
  firstNameOf,
  introState,
  revealContact,
} from '@/components/roommates/query';
import {
  AXES,
  LEVEL_MATCH,
  QUESTIONS,
  axisSentence,
  compatSummary,
  levelName,
} from '@/components/roommates/questions';

/**
 * Figma page/roommates-match 96:6513 and 96:7153.
 *
 * Two divergences from the frame, both deliberate.
 *
 * 1. The frame writes out the other student's answers: "Ayesha says headphones
 *    and quiet talking", "Ayesha would rather nobody did". Those sentences are
 *    the one thing this feature promises never to do, so they are not built.
 *    Each row names YOUR answer and how far apart the two of you are, and a
 *    row that matches may echo the answer because on a match theirs is yours
 *    and you already knew it. The data to write the frame's version does not
 *    reach this file: the pipeline projected it away.
 *
 * 2. The frame's "Where you would both be" section draws a room and a bed
 *    strip. `rooms` is empty on all 124 listings and there is no bed count
 *    anywhere in the dataset, so that section would be four dashed segments
 *    asserting a capacity the product does not hold. What stands in its place
 *    is the line the other student wrote themselves, and the frame's own
 *    warning that Hostello does not know whether any room has space.
 */

export const metadata = {
  title: 'How you two compare',
  robots: { index: false, follow: false },
};

export default async function RoommateMatchPage({ params }) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/roommates/matches/${id}`)}`);

  const me = await ensureOwnProfile(session);
  if (!me) redirect('/login?next=%2Froommates');

  // Resolved through the matching pipeline, never by id alone, so pasting an
  // id into the address bar cannot reach a student on another campus, of
  // another gender, blocked either way, or hidden.
  const match = await findMatch(me, id);
  if (!match) notFound();

  const firstName = firstNameOf(match.displayName);
  const meta = [match.year, match.programme, match.campus].filter(Boolean).join(', ');

  const intro = await introState({
    viewerStudentId: session.userId,
    otherStudentId: match.studentId,
  });
  const contact = await revealContact({
    viewerStudentId: session.userId,
    ownerStudentId: match.studentId,
    accepted: intro.accepted,
  });

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-10 lg:px-20 lg:py-12">
      <div className="mx-auto flex w-full max-w-[47.5rem] flex-col gap-8">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Roommates', href: '/roommates' },
            { label: 'Who fits', href: '/roommates/matches' },
            { label: match.displayName },
          ]}
        />

        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar initials={match.initials} size="lg" />
            <div className="flex min-w-0 flex-col">
              <h1 className="ds-display-m text-ds-ink">{match.displayName}</h1>
              {meta ? <p className="ds-body-m text-ds-ink-muted">{meta}</p> : null}
            </div>
          </div>

          {match.note ? (
            <p className="ds-body-l text-ds-ink">
              {firstName} wrote: {match.note}
            </p>
          ) : (
            <p className="ds-body-m text-ds-ink-muted">
              {firstName} has not written anything about themselves yet.
            </p>
          )}
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="ds-display-s text-ds-ink">How you two compare</h2>

          <MetaStrip
            segments={AXES.map((axis) => match.axes[axis])}
            labels={QUESTIONS.map((q) => q.short)}
            summary={compatSummary(match.axes)}
            label={`Compatibility with ${match.displayName}. ${compatSummary(match.axes)}`}
          />

          <dl className="flex flex-col">
            {QUESTIONS.map((question) => {
              const level = match.axes[question.axis];
              return (
                <div
                  key={question.axis}
                  className="flex flex-col gap-2 border-b border-solid border-ds-hairline py-3 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <dt className="ds-body-m-strong w-full text-ds-ink sm:w-24 sm:shrink-0">
                    {question.title}
                  </dt>
                  <dd className="flex min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:items-baseline sm:gap-4">
                    <Badge variant={level === LEVEL_MATCH ? 'solid' : 'outline'}>
                      {levelName(level)}
                    </Badge>
                    <span className="ds-body-m text-ds-ink-muted">
                      {axisSentence({
                        axis: question.axis,
                        level,
                        myValue: me.answers?.[question.axis],
                        firstName,
                      })}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="ds-body-s text-ds-ink-muted">
            You are seeing how far apart the two of you are, and never what {firstName}{' '}
            answered. Their six answers are theirs, the same way yours are yours.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="ds-display-s text-ds-ink">Where you would both be</h2>

          {match.looking ? (
            <p className="ds-body-m text-ds-ink">{match.looking}</p>
          ) : (
            <p className="ds-body-m text-ds-ink-muted">
              {firstName} has not said where they are looking.
            </p>
          )}

          <Alert title="Hostello does not know if any room has space">
            Occupancy comes from owners and no owner is reporting it yet, so no bed count on this
            site is real. Ask the warden on the call before either of you plans around a room.
          </Alert>
        </section>

        <section className="flex flex-col gap-3">
          {intro.accepted ? (
            <>
              <Alert title={`${firstName} accepted your introduction`}>
                {contact
                  ? `Reach ${firstName} on ${contact}. Hostello has no chat and does not pass messages on.`
                  : `${firstName} has not put a way to be reached on their profile. Hostello has no chat, so there is nothing further this site can do here.`}
              </Alert>
              <Button href="/roommates/matches" variant="secondary">
                Back to who fits
              </Button>
            </>
          ) : intro.incoming ? (
            <>
              <Alert title={`${firstName} wrote to you first`}>
                {intro.incoming.message}
              </Alert>
              <Button href="/roommates/matches">Answer it on your introductions</Button>
            </>
          ) : intro.sent ? (
            <>
              <Alert title="You have already asked">
                Nothing further happens here. {firstName} can accept, ignore it or block, and
                Hostello will not chase and will not tell you which of the three it was unless it
                is an accept.
              </Alert>
              <Button href={`/roommates/matches/${match.id}/intro`} variant="secondary">
                Rewrite your message
              </Button>
            </>
          ) : (
            <Button href={`/roommates/matches/${match.id}/intro`} className="w-full">
              Ask for an intro
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
