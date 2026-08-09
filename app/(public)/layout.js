import { getSession } from '@/lib/auth';
import SiteHeader from '@/components/ds/SiteHeader';
import SiteFooter from '@/components/ds/SiteFooter';

/**
 * Runs before the first paint of everything below it: reads the saved choice
 * and stamps the `dark` class on <html> so the theme never flashes. Kept as a
 * string literal because it must be synchronous and inline; a bundled module
 * would run too late. The storage key matches `THEME_STORAGE_KEY` in
 * components/public/ThemeToggle.
 *
 * The site defaults to LIGHT rather than following the OS preference, and the
 * toggle is honoured on every later visit.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('hostello-theme');var d=s==='dark';var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default async function PublicLayout({ children }) {
  const session = await getSession();

  // The JWT payload carries claims the client never needs, so pass only what
  // the header renders.
  const user = session ? { name: session.name || '', role: session.role || 'student' } : null;

  return (
    <>
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
          {children}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
