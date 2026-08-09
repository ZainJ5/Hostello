import Hostel from '@/models/Hostel';
import Payment from '@/models/Payment';
import Review from '@/models/Review';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import AdminShell from '@/components/admin/AdminShell';
import ToastProvider from '@/components/admin/ToastProvider';

// Every screen here reads the session cookie and live collection counts.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: { default: 'Admin', template: '%s · Hostello Admin' },
  robots: { index: false, follow: false },
};

/**
 * Runs before first paint so a returning admin never sees a light flash or the
 * sidebar snapping from wide to narrow. Both preferences are plain strings in
 * localStorage; a failure (private mode) silently falls back to the defaults.
 */
const BOOTSTRAP = `(function(){try{
var r=document.documentElement;
/* Light by default, matching the public site. The shared 'hostello-theme'
   key means a visitor who picks light there must not be flipped to dark on
   arriving here just because their OS preference says so. */
var t=localStorage.getItem('hostello-theme');
if(t==='dark')r.classList.add('dark');
var s=localStorage.getItem('hostello-admin-sidebar');
if(s==='collapsed')r.dataset.adminSidebar='collapsed';
}catch(e){}})();`;

/**
 * Chart tokens. Series colours are the only place the console names a colour
 * value directly, because SVG needs a real paint. Each slot is a step from the
 * Hostello scales in app/globals.css, and the five-slot order was validated
 * for lightness band, chroma, CVD separation and 3:1 contrast against both
 * the light (#ffffff) and dark (#0f172a) chart surfaces.
 */
const ADMIN_CSS = `
.admin-sidebar{width:16rem}
html[data-admin-sidebar="collapsed"] .admin-sidebar{width:4.5rem}
html[data-admin-sidebar="collapsed"] .admin-sidebar-label{display:none}
html[data-admin-sidebar="collapsed"] .admin-nav-item{justify-content:center;padding-left:0;padding-right:0}
html[data-admin-sidebar="collapsed"] .admin-only-expanded{display:none}
html:not([data-admin-sidebar="collapsed"]) .admin-only-collapsed{display:none}
html.dark .admin-only-light{display:none}
html:not(.dark) .admin-only-dark{display:none}

/* Categorical series use the historic Airbnb brand set (Rausch, Babu,
   Arches, Hof, Foggy), which stays on-brand while remaining distinguishable
   at small sizes and for the common colour-vision deficiencies. The
   sequential ramp is a single-hue rose scale so ordered data reads as
   ordered rather than categorical. */
.admin-scope{
  --chart-1:#ff385c; --chart-2:#00a699; --chart-3:#fc642d; --chart-4:#484848; --chart-5:#767676;
  --ramp-1:#ffccd5; --ramp-2:#ffa8b8; --ramp-3:#ff7590; --ramp-4:#ff385c; --ramp-5:#bb0836;
  --chart-grid:var(--border);
  --chart-axis:var(--muted-foreground);
  --chart-surface:var(--surface);
}
html.dark .admin-scope{
  --chart-1:#ff7590; --chart-2:#2ec4b6; --chart-3:#ff8a5c; --chart-4:#c1c1c1; --chart-5:#929292;
  --ramp-1:#560316; --ramp-2:#9a0a30; --ramp-3:#e00b41; --ramp-4:#ff5a78; --ramp-5:#ffa8b8;
}
.admin-scope .recharts-surface{overflow:visible}
.admin-scope .recharts-cartesian-axis-tick text{fill:var(--chart-axis);font-size:11px}
.admin-scope .recharts-label{fill:var(--chart-axis)}
`;

export default async function AdminLayout({ children }) {
  const session = await requireAdminPage();

  const [payments, listings, reviews] = await Promise.all([
    Payment.countDocuments({ status: 'pending' }),
    Hostel.countDocuments({ status: 'pending_review' }),
    Review.countDocuments({ status: 'flagged' }),
  ]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <ToastProvider>
        <AdminShell
          session={{ name: session.name, email: session.email, role: session.role }}
          counts={{ payments, listings, reviews }}
        >
          {children}
        </AdminShell>
      </ToastProvider>
    </>
  );
}
