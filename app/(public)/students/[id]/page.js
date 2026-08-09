import Link from 'next/link';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import { slugify, timeAgo } from '@/lib/utils';
import Badge from '@/components/ds/Badge';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';

import Avatar from '@/components/community/Avatar';
import Breadcrumbs from '@/components/community/Breadcrumbs';
import PostCard from '@/components/community/PostCard';
import { studentProfile } from '@/components/community/query';

/**
 * /students/[id] : a student profile.
 *
 * A profile shows what a student chose to share, and on this site choosing to
 * share means publishing under your name: answering a question on a listing,
 * or writing a review. Nothing on this page is here because it was sitting in
 * an account record. A student with nothing published has no profile at all
 * and this route 404s for them, which is the correct answer rather than an
 * empty page confirming that the account exists.
 *
 * THE SIX ROOMMATE ANSWERS ARE NOT HERE. Not hidden behind a check, not
 * fetched and filtered: `RoommateProfile` is never queried by this route or by
 * anything it calls. There is no code path from this page to another student's
 * answers, which is a stronger guarantee than a component that declines to
 * render them.
 *
 * Never indexed. A page about a named person, reachable from a search for that
 * name, is a different thing from a page about a building.
 */

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectDB();
  const profile = await studentProfile(id);
  return {
    title: profile ? profile.name : 'Student',
    robots: { index: false, follow: false },
  };
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-solid border-ds-hairline py-3 sm:flex-row sm:gap-6">
      <dt className="ds-body-m-strong shrink-0 text-ds-ink sm:w-48">{label}</dt>
      <dd className="ds-body-m min-w-px text-ds-ink-muted">{children}</dd>
    </div>
  );
}

export default async function StudentProfilePage({ params }) {
  const { id } = await params;

  await connectDB();
  const profile = await studentProfile(id);
  if (!profile) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Breadcrumbs
        className="mb-4"
        trail={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
          ...(profile.university
            ? [{ href: `/cohort/${slugify(profile.university)}`, label: profile.university }]
            : [{ href: '/cohort', label: 'By campus' }]),
          { label: profile.name },
        ]}
      />

      <div className="flex items-center gap-4">
        <Avatar name={profile.name} size="lg" />
        <div className="min-w-px">
          <h1 className="ds-display-m text-balance text-ds-ink">{profile.name}</h1>
          {profile.university || profile.city ? (
            <p className="ds-body-m text-ds-ink-muted">
              {[profile.university, profile.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
        </div>
      </div>

      {profile.emailVerified ? (
        <div className="mt-4 flex">
          <Badge>Student email verified</Badge>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="ds-display-s text-ds-ink">What is public</h2>
        <dl className="mt-2">
          <Row label="Name">
            First name and surname initial. That is all any student sees, anywhere on
            Hostello.
          </Row>
          <Row label="Campus">
            {profile.university || 'Not given'}
            {profile.city ? `, ${profile.city}` : ''}
          </Row>
          <Row label="Answers written">
            {profile.answerCount} on hostel listings, each one under this name
          </Row>
          <Row label="Reviews written">
            {profile.reviewCount === 0
              ? 'None'
              : `${profile.reviewCount} ${profile.reviewCount === 1 ? 'review' : 'reviews'}, under this name`}
          </Row>
        </dl>
      </section>

      <Alert title="The six roommate answers are not on this page" className="mt-8">
        They never are, for this student or for you. They only ever produce the six
        block comparison on a match, and no student can read another student&apos;s
        answers.
      </Alert>

      {profile.answers.length > 0 ? (
        <section className="mt-10">
          <h2 className="ds-display-s text-ds-ink">What they have answered</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {profile.answers.map((a) => (
              <li key={a.id}>
                <PostCard
                  tag={a.hostelName || undefined}
                  title={a.question}
                  href={a.href}
                  body={a.body}
                  time={a.createdAt ? `answered ${timeAgo(a.createdAt)}` : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-solid border-ds-hairline pt-6">
        <Button href="/roommates">Ask for an intro</Button>
        {/*
          Not "Report a student". There is no student report endpoint and
          building one would need a moderation queue in the frozen admin
          console, so the link says what it actually does: it opens the safety
          page, which carries the address to write to.
        */}
        <Link
          href="/safety"
          className="ds-body-m ds-tap ds-focusable inline-flex items-center px-2 text-ds-cobalt underline-offset-2 hover:underline"
        >
          Safety and reporting
        </Link>
      </div>
    </div>
  );
}
