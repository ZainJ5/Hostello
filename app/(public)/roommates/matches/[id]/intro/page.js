import { notFound, redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import Breadcrumbs from '@/components/roommates/Breadcrumbs';
import IntroForm from '@/components/roommates/IntroForm';
import {
  ensureOwnProfile,
  findMatch,
  firstNameOf,
  introState,
} from '@/components/roommates/query';

/**
 * Figma page/roommates-intro 96:6657 and 96:7293.
 *
 * The end of the feature. A message goes across, and that is the whole of what
 * Hostello does: no chat, no allocation, no room assignment, no obligation on
 * either side.
 *
 * The candidate is resolved through the matching pipeline rather than by id,
 * so this page cannot be used to write to somebody the caller was never
 * eligible to be shown, and the profile it renders carries per axis verdicts
 * and no answers.
 */

export const metadata = {
  title: 'Ask for an intro',
  robots: { index: false, follow: false },
};

export default async function RoommateIntroPage({ params }) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/roommates/matches/${id}/intro`)}`);
  }

  const me = await ensureOwnProfile(session);
  if (!me) redirect('/login?next=%2Froommates');

  const match = await findMatch(me, id);
  if (!match) notFound();

  const intro = await introState({
    viewerStudentId: session.userId,
    otherStudentId: match.studentId,
  });

  const firstName = firstNameOf(match.displayName);

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-10 lg:px-20 lg:py-12">
      <div className="mx-auto flex w-full max-w-[47.5rem] flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Roommates', href: '/roommates' },
            { label: match.displayName, href: `/roommates/matches/${match.id}` },
            { label: 'Ask for an intro' },
          ]}
        />

        <div className="flex flex-col gap-3">
          <h1 className="ds-display-xl text-ds-ink">Say hello to {match.displayName}</h1>
          <p className="ds-body-l text-ds-ink-muted">
            {firstName} sees this message, your first name, your year and your department. Not
            your surname, not how to reach you, and not one of your six answers, unless the
            introduction is accepted.
          </p>
        </div>

        <IntroForm
          match={{ id: match.id, displayName: match.displayName }}
          alreadySent={intro.sent}
        />
      </div>
    </div>
  );
}
