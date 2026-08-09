'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Star,
  UserCog,
  Wallet,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';
import { ToastProvider, useToast } from './Toast';
import { apiSend } from './api-client';
import ActionBanner from './ActionBanner';

const NAV = [
  { href: '/owner', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/owner/listings', label: 'My Listings', icon: Building2, badge: 'listings' },
  { href: '/owner/bookings', label: 'Bookings', icon: CalendarCheck, badge: 'bookings' },
  { href: '/owner/reviews', label: 'Reviews', icon: Star, badge: 'reviews' },
  { href: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/owner/payments', label: 'Payments', icon: Wallet, badge: 'payments' },
  { href: '/owner/profile', label: 'Profile', icon: UserCog },
];

function badgeCount(key, summary) {
  if (!summary) return 0;
  if (key === 'listings') return summary.pendingPayment + summary.rejected;
  if (key === 'bookings') return summary.pendingBookings;
  if (key === 'reviews') return summary.unrepliedReviews;
  if (key === 'payments') return summary.rejectedPayments;
  return 0;
}

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ pathname, summary, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Owner console">
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        const count = badgeCount(item.badge, summary);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium',
              'cursor-pointer transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {count > 0 && (
              <span
                className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-slate-950"
                aria-label={`${count} need attention`}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ user, summary, pathname, onNavigate }) {
  const toast = useToast();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiSend('/api/owner/logout', { method: 'POST' });
      router.replace('/');
      router.refresh();
    } catch (err) {
      toast.error(err.message);
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="border-b border-border px-5 py-5">
        <Link
          href="/owner"
          onClick={onNavigate}
          className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-sm font-extrabold text-white">
            H
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
            Hostello
          </span>
        </Link>
        <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Owner console
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground" title={user.businessName}>
          {user.businessName}
        </p>
      </div>

      <div className="px-3 pt-4">
        <Button
          href="/owner/listings/new"
          variant="accent"
          size="md"
          className="w-full"
          onClick={onNavigate}
        >
          <Plus className="size-4.5" aria-hidden="true" />
          Add new hostel
        </Button>
      </div>

      <NavList pathname={pathname} summary={summary} onNavigate={onNavigate} />

      <div className="space-y-2 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} src={user.avatar} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Link
          href="/"
          className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Globe className="size-4.5 shrink-0" aria-hidden="true" />
          View public site
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        >
          <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  );
}

function Shell({ user, summary, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the slide-over whenever the route changes, including on a browser
  // back/forward, where no nav item was clicked. Adjusted during render rather
  // than in an effect so the panel never paints over the new page for a frame.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-surface-sunken">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-66 flex-col border-r border-border bg-surface lg:flex">
        <SidebarContent user={user} summary={summary} pathname={pathname} />
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-80 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 cursor-default bg-[var(--overlay)]"
          />
          <aside
            className="animate-fade-in absolute inset-y-0 left-0 flex w-[min(19rem,88vw)] flex-col border-r border-border bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Owner console menu"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent
              user={user}
              summary={summary}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-66">
        {/* Mobile top bar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user.businessName}</p>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Owner console
            </p>
          </div>
          <Button href="/owner/listings/new" variant="accent" size="sm" aria-label="Add new hostel">
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Add hostel</span>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ActionBanner summary={summary} />
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar shell for `/owner`. It mirrors the admin console (same tokens, same
 * 264px rail, same density) but is branded to the owner's business rather than
 * to Hostello operations, with the "Add new hostel" CTA sitting above the
 * navigation where an owner's primary job lives.
 */
export default function OwnerShell({ user, summary, children }) {
  return (
    <ToastProvider>
      <Shell user={user} summary={summary}>
        {children}
      </Shell>
    </ToastProvider>
  );
}
