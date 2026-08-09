import Link from 'next/link';
import { Compass } from 'lucide-react';
import AccountMenu from '@/components/student/AccountMenu';
import StudentNav from '@/components/student/StudentNav';
import { ToastProvider } from '@/components/student/Toast';
import { requireStudentUser } from './_lib/session';

export const metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

/**
 * The student account shell.
 *
 * Deliberately lighter than the owner and admin consoles: five sections don't
 * justify a persistent sidebar, so the chrome is one slim header plus a tab
 * rail that becomes a horizontal scroller on a phone. Everything below is the
 * student's own data, and the guard here runs before any of it is fetched.
 */
export default async function StudentLayout({ children }) {
  const { user } = await requireStudentUser('/dashboard', 'name email avatar');

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col bg-surface-sunken">
        <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-display text-xl font-extrabold tracking-tight text-brand-700 dark:text-brand-400">
                Hostello
              </span>
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                Account
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              <Link
                href="/hostels"
                className="hidden h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:inline-flex"
              >
                <Compass className="size-4" aria-hidden="true" />
                Browse hostels
              </Link>
              <AccountMenu name={user.name} email={user.email} avatar={user.avatar} />
            </div>
          </div>

          <StudentNav />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
          {children}
        </main>

        <footer className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} Hostello. Pakistan&apos;s student hostel finder</p>
            <Link
              href="/hostels"
              className="cursor-pointer font-medium text-brand-700 transition-colors duration-200 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Find a hostel
            </Link>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
