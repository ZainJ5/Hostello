import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Alert, EmptyState } from '@/components/ds/Feedback';
import Button from '@/components/ds/Button';

import AnswerCoverageStrip from '@/components/community/AnswerCoverageStrip';
import AskForm from '@/components/community/AskForm';
import Breadcrumbs from '@/components/community/Breadcrumbs';
import NudgeButton from '@/components/community/NudgeButton';
import PostCard from '@/components/community/PostCard';
import { askDataForHostel, publishedHostel } from '@/components/community/query';

/**
 * /hostels/[slug]/ask
 *
 * Ask residents lives in two places: as a section on the listing itself, which
 * Agent 1 links into, and here, at its own URL.
 *
 * The separate URL is not a convenience. These threads are the answer to a
 * question somebody types into Google about a specific building, and a section
 * that only exists inside a listing page has no address of its own to rank, no
 * title to match and nothing to link to from a search result. So the page is
 * server rendered, carries its own title and description, and every thread on
 * it has a real URL one level deeper.
 */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  await connectDB();
  const hostel = await publishedHostel(slug);
  if (!hostel) return { title: 'Ask residents' };

  return {
    title: `Ask residents of ${hostel.name}`,
    description: `Questions about ${hostel.name} in ${hostel.city}, answered by the students who live there. Water, power, the mess, safety, wifi and the owner.`,
    alternates: { canonical: `/hostels/${hostel.slug}/ask` },
  };
}

export default async function AskResidentsPage({ params }) {
  const { slug } = await params;

  await connectDB();
  const hostel = await publishedHostel(slug);
  if (!hostel) notFound();

  const [{ answered, open, coverage }, session] = await Promise.all([
    askDataForHostel(hostel._id),
    getSession(),
  ]);

  const signedIn = Boolean(session);
  const signInHref = `/login?next=${encodeURIComponent(`/hostels/${hostel.slug}/ask`)}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: `/hostels?city=${encodeURIComponent(hostel.city)}`, label: hostel.city },
          { href: `/hostels/${hostel.slug}`, label: hostel.name },
          { label: 'Ask residents' },
        ]}
      />

      <h1 className="ds-display-xl text-balance text-ds-ink">
        Ask residents of {hostel.name}
      </h1>

      <p className="ds-body-l mt-4 max-w-[70ch] text-pretty text-ds-ink-muted">
        Only students living here can answer, which is what makes these worth reading.
        Answers stay on the listing, so the tenth person to wonder about the water
        pressure reads the answer instead of asking again.
      </p>

      <AnswerCoverageStrip coverage={coverage} className="mt-8" />

      {/* ── Answered ── */}
      {answered.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {answered.map((thread) => {
            const top = thread.answers[0];
            return (
              <li key={thread.id}>
                <PostCard
                  title={thread.question}
                  href={thread.href}
                  body={top?.body}
                  meta={top?.author}
                  time={top?.createdAt ? `answered ${timeAgo(top.createdAt)}` : undefined}
                >
                  {thread.answerCount > 1 ? (
                    <p className="ds-body-s text-ds-ink-muted">
                      {thread.answerCount} residents answered this one.
                    </p>
                  ) : null}
                </PostCard>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ── Open ── */}
      {open.length > 0 ? (
        <section className="mt-10">
          <h2 className="ds-display-m border-b border-solid border-ds-ink pb-2 text-ds-ink">
            Nobody has answered these yet
          </h2>

          <ul className="mt-4 flex flex-col gap-3">
            {open.map((thread) => (
              <li key={thread.id}>
                <div className="ds-elevated flex items-center justify-between gap-3 rounded-ds-inner py-2 pl-4 pr-2">
                  <p className="ds-body-m min-w-px text-pretty text-ds-ink">
                    {thread.question}
                  </p>
                  <NudgeButton
                    threadId={thread.id}
                    signedIn={signedIn}
                    signInHref={signInHref}
                    count={thread.nudgeCount}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Alert title="A nudge does not name you" className="mt-4">
            It goes to everybody living here as a reminder that a question is open.
            Your name appears only if you reply to somebody who answers.
          </Alert>
        </section>
      ) : null}

      {/* ── Nothing at all yet ── */}
      {answered.length === 0 && open.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Nobody has asked anything about this hostel yet"
          body="This page fills up from the first question. Ask the thing you actually want to know and a resident will answer it, or nudge it until somebody does."
          action={
            <Button href={`/hostels/${hostel.slug}`} variant="secondary">
              Back to the listing
            </Button>
          }
        />
      ) : null}

      {/* ── Ask ── */}
      <section className="mt-10">
        <AskForm hostelSlug={hostel.slug} signedIn={signedIn} signInHref={signInHref} />
      </section>
    </div>
  );
}
