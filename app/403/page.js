import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { homeForRole } from '@/components/auth/validation';

export const metadata = {
  title: 'Access denied',
  description: 'You do not have permission to view this page.',
  robots: { index: false, follow: false },
};

const ROLE_LABEL = {
  student: 'a student account',
  owner: 'a hostel owner account',
  admin: 'an admin account',
};

/**
 * Where proxy.js sends a signed-in user who hit a section their role can't
 * open. Deliberately not a 404: pretending the page doesn't exist would leave
 * an owner poking at /admin wondering whether they typed it wrong.
 */
export default async function ForbiddenPage() {
  const session = await getSession();
  const home = session ? homeForRole(session.role) : '/login';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-sunken px-5 py-16">
      <Card className="w-full max-w-lg p-8 text-center shadow-lg sm:p-10">
        <span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300">
          <ShieldAlert className="size-8" aria-hidden="true" />
        </span>

        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Error 403
        </p>
        <h1 className="text-h2 mt-2 text-balance text-foreground">
          You don&apos;t have access to this page
        </h1>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">
          {session ? (
            <>
              You&apos;re signed in as{' '}
              <span className="font-medium text-foreground">{session.email}</span> with{' '}
              {ROLE_LABEL[session.role] || 'an account'}, which can&apos;t open this
              section. If that looks wrong, sign in with the right account.
            </>
          ) : (
            <>Your session has ended. Sign in again to continue.</>
          )}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href={home} size="lg">
            {session ? 'Go to my dashboard' : 'Sign in'}
          </Button>
          <Button href="/" variant="secondary" size="lg">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Hostello
          </Button>
        </div>

        {session && (
          <p className="mt-6 text-xs text-muted-foreground">
            Need a different account?{' '}
            <Link
              href="/login"
              className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
            >
              Sign in as someone else
            </Link>
          </p>
        )}
      </Card>
    </main>
  );
}
