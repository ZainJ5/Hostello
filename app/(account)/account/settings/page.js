import Link from 'next/link';
import AccountPage from '@/components/student/AccountPage';
import DangerZone from '@/components/student/DangerZone';
import PasswordForm from '@/components/student/PasswordForm';
import SignOutButton from '@/components/student/SignOutButton';
import { requireStudentUser } from '../../_lib/session';
import { changePasswordAction } from '../profile/actions';

export const metadata = { title: 'Settings' };

/**
 * The settings frame lists six rows that open sub-screens: university,
 * language, who can find you, blocked students, notifications and email
 * address. Four of those are roommate matching or notification features that
 * are not built and have nothing behind them, and university belongs to the
 * profile form, so drawing a row that opens nothing would be six dead ends.
 *
 * What is left is what the account actually holds: the address it is on, the
 * password, and the two ways to leave. The "Leaving" panel is the frame's,
 * unchanged in composition.
 */
export default async function SettingsPage() {
  const { user } = await requireStudentUser('/account/settings', 'email emailVerified');

  return (
    <AccountPage
      title="Settings"
      lead="The address your account is on, the password you sign in with, and the two ways to leave."
      current="Settings"
    >
      <div className="flex flex-col gap-8">
        <section aria-labelledby="email-heading" className="flex flex-col gap-3">
          <h2 id="email-heading" className="ds-display-m text-ds-ink">
            Email address
          </h2>
          <div className="ds-elevated flex flex-col gap-1 rounded-ds-inner p-4">
            <p className="ds-body-m-strong break-all text-ds-ink">{user.email}</p>
            <p className="ds-body-s text-ds-ink-muted">
              {user.emailVerified
                ? 'Confirmed. This is where account emails and reset codes go.'
                : 'Not confirmed yet. Reset codes and account emails still go here.'}
            </p>
          </div>
          <p className="ds-body-s text-ds-ink-muted">
            The address cannot be changed here yet. Everything else about you is on the{' '}
            <Link
              href="/account/profile"
              className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              profile page
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="password-heading" className="flex flex-col gap-3">
          <h2 id="password-heading" className="ds-display-m text-ds-ink">
            Password
          </h2>
          {/* The action is passed down rather than imported by the client
              component, so the form stays free of any server-only module
              graph. */}
          <PasswordForm action={changePasswordAction} />
        </section>

        <section
          aria-labelledby="leaving-heading"
          className="flex flex-col gap-4 rounded-ds-inner border border-solid border-ds-hairline bg-ds-surface-sunken p-4"
        >
          <h2 id="leaving-heading" className="ds-display-m text-ds-ink">
            Leaving
          </h2>
          <SignOutButton />
          <DangerZone email={user.email} />
          <p className="ds-body-s text-pretty text-ds-ink-muted">
            Deleting removes your saved shortlist and your reviews. Enquiries you already
            sent stay with the owner, without your account attached to them.
          </p>
        </section>
      </div>
    </AccountPage>
  );
}
