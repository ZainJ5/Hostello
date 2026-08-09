import Image from 'next/image';

import { getSession } from '@/lib/auth';
import Button from '@/components/ds/Button';
import Breadcrumbs from '@/components/roommates/Breadcrumbs';
import Questionnaire from '@/components/roommates/Questionnaire';
import { ensureOwnProfile } from '@/components/roommates/query';
import { CAMPUS_NAMES } from '@/components/hostels/campuses';
import { GENDERS, YEARS } from '@/models/RoommateProfile';

/**
 * Figma page/roommates-questionnaire 96:6099 and 96:6747.
 *
 * `/roommates` is the questionnaire, not a landing page in front of one.
 * The frames breadcrumb this as Home / Roommates / How you live, which implies
 * an index between the two, but no index frame exists and an index whose only
 * job is to link to the form is a page that exists to be skipped.
 *
 * Signed out, the same route is the explanation: what the six questions are
 * for, who can read them, and a way in. That is where the roommate
 * illustration lives, because it is the only screen in the feature with room
 * for a picture rather than a person's answers.
 */

export const metadata = {
  title: 'How you live',
  description:
    'Six questions about how you actually live, so Hostello can suggest students on your own campus who answered the same way. Your answers are never shown to another student.',
  // Indexable, because a crawler is always signed out and what it sees is the
  // explanation of the feature. Every route past this one is a person's own
  // data and carries robots: index false.
};

const INTRO =
  'Six questions, about two minutes. They decide who we suggest and nothing else. They never appear on your profile and no other student can read them.';

/** "3 August". Formatted here so the client component never formats a date. */
function whenLabel(date) {
  if (!date) return '';
  return `on ${new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'long' })}`;
}

function SignedOut() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h1 className="ds-display-xl text-ds-ink">How you live</h1>
        <p className="ds-body-l text-ds-ink-muted">{INTRO}</p>
        <ul className="flex flex-col gap-3">
          {[
            'Matching runs inside your own campus and your own gender, and nowhere else.',
            'Your six answers stay yours. Another student sees how far apart you are, never what you picked.',
            'Nothing is booked. Hostello makes an introduction and the room is still arranged with the owner.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 border border-solid border-ds-ink bg-ds-primary"
              />
              <span className="ds-body-m text-ds-ink-muted">{line}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button href="/login?next=%2Froommates">Sign in to answer</Button>
          <Button href="/signup" variant="secondary">
            Create an account
          </Button>
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-[26rem]">
        {/* Exported from Figma illustration/shared-room-two-students 160:15450
            and committed as is, not redrawn. `unoptimized` because the image
            optimiser refuses SVG unless dangerouslyAllowSVG is turned on, and
            turning that on for one trusted local asset would also open it to
            every remote host in next.config.mjs. */}
        <Image
          src="/illustrations/find-a-roommate.svg"
          alt=""
          width={1024}
          height={1024}
          unoptimized
          priority
          className="h-auto w-full rounded-ds-inner border border-solid border-ds-hairline"
        />
      </div>
    </div>
  );
}

export default async function RoommatesPage() {
  const session = await getSession();

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-6">
        <Breadcrumbs
          trail={[
            { label: 'Home', href: '/' },
            { label: 'Roommates', href: '/roommates' },
            { label: 'How you live' },
          ]}
        />

        {session ? (
          <SignedInQuestionnaire session={session} />
        ) : (
          <SignedOut />
        )}
      </div>
    </div>
  );
}

async function SignedInQuestionnaire({ session }) {
  const profile = await ensureOwnProfile(session);

  if (!profile) return <SignedOut />;

  // Shaped by hand. A roommate route never hands a Mongoose document to a
  // component, and this one carries the answers, so it is the last place that
  // deserves a spread of whatever the schema happens to hold.
  const own = {
    campus: profile.campus || '',
    gender: profile.gender || '',
    year: profile.year || '',
    programme: profile.programme || '',
    note: profile.note || '',
    looking: profile.looking || '',
    contact: profile.contact || '',
    answers: {
      sleep: profile.answers?.sleep ?? null,
      clean: profile.answers?.clean ?? null,
      study: profile.answers?.study ?? null,
      guests: profile.answers?.guests ?? null,
      smoke: profile.answers?.smoke ?? null,
      noise: profile.answers?.noise ?? null,
    },
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="ds-display-xl text-ds-ink">How you live</h1>
        <p className="ds-body-l text-ds-ink-muted">{INTRO}</p>
      </div>

      <Questionnaire
        profile={own}
        savedWhen={whenLabel(profile.answersUpdatedAt)}
        campusNames={CAMPUS_NAMES}
        years={YEARS}
        genders={GENDERS}
      />
    </>
  );
}
