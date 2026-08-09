import { getSession } from '@/lib/auth';
import SiteHeader from '@/components/ds/SiteHeader';
import SiteFooter from '@/components/ds/SiteFooter';

/**
 * The auth screens are pages on the website, not a separate product.
 *
 * The previous shell was a split screen with a gradient brand panel carrying
 * four proof points and three counters. Every frame in the 2026 file puts
 * these routes inside the ordinary site chrome instead: header, breadcrumb,
 * one centred column, footer. That is the composition built here. The proof
 * points went with it; the ones that were still true live on the About page
 * and in the footer, and the ones that were not (a security deposit shown up
 * front, room by room pricing) are not carried forward.
 *
 * The column caps at 34rem, which is the 544px the 1440 frames measure, and
 * it is centred rather than offset so the page reads the same at 360.
 */

// Duplicated verbatim from app/(public)/layout.js. It has to be inline and
// synchronous to beat the first paint, and this route group does not nest
// inside that one. The storage key matches THEME_STORAGE_KEY in
// components/public/ThemeToggle.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('hostello-theme');var d=s==='dark';var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

export default async function AuthLayout({ children }) {
  const session = await getSession();
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
          <div className="mx-auto w-full max-w-160 px-4 py-6 lg:py-10">{children}</div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
