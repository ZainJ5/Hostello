import { getSession } from '@/lib/auth';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';

/**
 * Runs before the first paint of everything below it: reads the saved choice
 * and stamps the `dark` class on <html> so the theme never flashes. Kept as a
 * string literal because it must be synchronous and inline; a bundled module
 * would run too late. The storage key matches `THEME_STORAGE_KEY` in
 * components/public/ThemeToggle.
 *
 * The public site defaults to LIGHT rather than following the OS preference:
 * listing photos and the single Rausch accent are calibrated against white
 * (see DESIGN.md). Dark remains available via the toggle and is honoured on
 * every later visit.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('hostello-theme');var d=s==='dark';var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default async function PublicLayout({ children }) {
  const session = await getSession();

  // The JWT payload carries claims the client never needs, so pass only what
  // the navbar renders.
  const navSession = session
    ? { name: session.name || '', email: session.email || '', role: session.role || 'student' }
    : null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh flex-col">
        <Navbar session={navSession} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
