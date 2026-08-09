import { getSession } from '@/lib/auth';
import SiteHeader from '@/components/ds/SiteHeader';
import SiteFooter from '@/components/ds/SiteFooter';
import { ToastProvider } from '@/components/student/Toast';

export const metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
};

/**
 * The account shell.
 *
 * There is no separate account chrome any more. This is a website, not an app,
 * so the account pages carry the same header and footer as every other page
 * and the section rail lives inside the page, next to the content. The old
 * sticky account header, its tab strip and its account menu are gone; the
 * header's own signed-in state already carries the route in, and signing out
 * moved to /account/settings where the frame puts it.
 *
 * THE GUARD IS NOT HERE, DELIBERATELY. A layout cannot know which path was
 * requested, so a redirect thrown from here could only ever send a signed-out
 * student back to /account and never to the page they were actually aiming
 * for. Every page in this group calls `requireStudentUser` with its own path
 * as the first thing it does, which both authorises the request and preserves
 * the destination. That call is the authorisation boundary and it is not
 * optional: a new page added to this group without it would render for anyone.
 *
 * The name comes from the session rather than the database, because it is the
 * only field the header reads and `updateProfileAction` already re-issues the
 * session whenever the name changes.
 */

// Duplicated verbatim from app/(public)/layout.js. It has to be inline and
// synchronous to beat the first paint, and this route group does not nest
// inside that one. The storage key matches THEME_STORAGE_KEY in
// components/public/ThemeToggle.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('hostello-theme');var d=s==='dark';var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default async function AccountLayout({ children }) {
  const session = await getSession();
  const user = session ? { name: session.name || '', role: session.role || 'student' } : null;

  return (
    <ToastProvider>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

      <a
        href="#main"
        className="ds-body-m-strong sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:items-center focus:rounded-ds-inner focus:border focus:border-solid focus:border-ds-ink focus:bg-ds-primary focus:px-4 focus:text-ds-on-primary"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh flex-col bg-ds-surface text-ds-ink">
        <SiteHeader user={user} />
        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-[100rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
            {children}
          </div>
        </main>
        <SiteFooter />
      </div>
    </ToastProvider>
  );
}
