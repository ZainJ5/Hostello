import Link from 'next/link';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Alert } from '@/components/ds/Feedback';

import AnswerForm from '@/components/community/AnswerForm';
import Breadcrumbs from '@/components/community/Breadcrumbs';
import PostCard from '@/components/community/PostCard';
import ReportButton from '@/components/community/ReportButton';
import { livesAt } from '@/components/community/residency';
import { publishedHostel, threadBySlug } from '@/components/community/query';
import { topicLabel } from '@/components/community/topics';

/**
 * /hostels/[slug]/ask/[thread]
 *
 * One question and its answers, at a permanent URL.
 *
 * This is the page a search result points at. Somebody types the name of a
 * building and the word "wifi" into Google eight months after a resident
 * answered, and this is what they should land on: the question as the heading,
 * the answer as the first thing on the page, and the listing one click away.
 *
 * It carries QAPage structured data for the same reason. The content genuinely
 * is a question with answers from named people at known times, so describing
 * it as one is a statement of fact rather than markup dressing.
 */

export async function generateMetadata({ params }) {
  const { slug, thread: threadSlug } = await params;
  await connectDB();
  const thread = await threadBySlug(slug, threadSlug);
  if (!thread) return { title: 'Question not found' };

  const first = thread.answers[0]?.body || '';
  const description = first
    ? `${first.slice(0, 150)}${first.length > 150 ? '...' : ''}`
    : `Nobody has answered this question about ${thread.hostelName} yet. Residents can answer it, and anybody can nudge it.`;

  return {
    title: `${thread.question} ${thread.hostelName}`,
    description,
    alternates: { canonical: thread.href },
    // An unanswered question is a page with a heading and no content. It is
    // worth having a URL so it can be nudged and shared; it is not worth
    // putting in an index until somebody answers it.
    ...(thread.answerCount === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ThreadPage({ params }) {
  const { slug, thread: threadSlug } = await params;

  await connectDB();
  const [hostel, thread] = await Promise.all([
    publishedHostel(slug),
    threadBySlug(slug, threadSlug),
  ]);
  if (!hostel || !thread) notFound();

  const session = await getSession();
  const resident =
    session?.role === 'student' ? await livesAt(session.userId, hostel._id) : false;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: thread.question,
      answerCount: thread.answerCount,
      ...(thread.createdAt ? { dateCreated: thread.createdAt } : {}),
      ...(thread.answers.length
        ? {
            acceptedAnswer: {
              '@type': 'Answer',
              text: thread.answers[0].body,
              ...(thread.answers[0].createdAt
                ? { dateCreated: thread.answers[0].createdAt }
                : {}),
              author: { '@type': 'Person', name: thread.answers[0].author },
            },
          }
        : {}),
    },
  };

  const answerGate = session
    ? `You are signed in, but Hostello has no record of you living at ${hostel.name}. Answers come from residents, which is the only reason they are worth reading.`
    : 'Sign in with the account you booked this hostel on, and you can answer.';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: `/hostels/${hostel.slug}`, label: hostel.name },
          { href: `/hostels/${hostel.slug}/ask`, label: 'Ask residents' },
          { label: thread.question },
        ]}
      />

      <p className="ds-label text-ds-ink-muted">{topicLabel(thread.topic)}</p>

      <h1 className="ds-display-m mt-2 text-balance text-ds-ink">{thread.question}</h1>

      <p className="ds-body-s mt-3 text-ds-ink-muted">
        Asked by {thread.askedBy}
        {thread.createdAt ? ` ${timeAgo(thread.createdAt)}` : ''} about{' '}
        <Link
          href={`/hostels/${hostel.slug}`}
          className="ds-focusable text-ds-cobalt underline underline-offset-2"
        >
          {hostel.name}
        </Link>
        .
      </p>

      {thread.answers.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {thread.answers.map((answer) => (
            <li key={answer.id}>
              <PostCard
                body={answer.body}
                meta={answer.author}
                time={answer.createdAt ? `answered ${timeAgo(answer.createdAt)}` : undefined}
                actions={
                  session && session.userId !== answer.authorId ? (
                    <ReportButton
                      endpoint={`/api/community/threads/${thread.id}/flag`}
                      payload={{ answerId: answer.id }}
                      label="Report this answer"
                    />
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <Alert title="Nobody has answered this yet" className="mt-8">
          Questions here are answered by residents when they get to them. Nudging it
          from the ask page reminds everybody living there that it is open, and does
          not name you.
        </Alert>
      )}

      <section className="mt-10">
        <AnswerForm threadId={thread.id} canAnswer={resident} reason={answerGate} />
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-solid border-ds-hairline pt-4">
        <Link
          href={`/hostels/${hostel.slug}/ask`}
          className="ds-body-m ds-focusable text-ds-cobalt underline underline-offset-2"
        >
          Every question about {hostel.name}
        </Link>
        {session && session.userId !== undefined ? (
          <ReportButton
            endpoint={`/api/community/threads/${thread.id}/flag`}
            label="Report this question"
          />
        ) : null}
      </div>
    </div>
  );
}
