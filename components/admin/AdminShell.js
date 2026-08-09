'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Building2,
  CalendarCheck,
  ChartColumn,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  ScrollText,
  Settings as SettingsIcon,
  Star,
  Sun,
  Globe,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Feedback';
import Badge from '@/components/ui/Badge';
import GlobalSearch from '@/components/admin/GlobalSearch';
import { apiSend } from '@/components/admin/client';
import { cn } from '@/lib/utils';

const NAV = [
  {
    heading: null,
    items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }],
  },
  {
    heading: 'Marketplace',
    items: [
      { href: '/admin/listings', label: 'Listings', icon: Building2 },
      { href: '/admin/payments', label: 'Payments', icon: Wallet, badge: 'payments' },
      { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, badge: 'reviews' },
    ],
  },
  {
    heading: 'People',
    items: [{ href: '/admin/users', label: 'Users', icon: Users }],
  },
  {
    heading: 'Insight',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    heading: 'Configure',
    items: [{ href: '/admin/settings', label: 'Settings', icon: SettingsIcon }],
  },
];

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ pathname, counts, onNavigate }) {
  return (
    <nav className="flex flex-col gap-4 px-2.5 py-3" aria-label="Admin sections">
      {NAV.map((group, gi) => (
        <div key={group.heading || `group-${gi}`} className="flex flex-col gap-0.5">
          {group.heading && (
            <p className="admin-sidebar-label px-2.5 pb-1 pt-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {group.heading}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            const count = item.badge ? counts?.[item.badge] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'admin-nav-item group relative flex h-11 items-center gap-3 rounded-xl px-2.5',
                  'text-sm font-medium transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/70 dark:text-brand-200'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand-600 transition-opacity duration-200',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                <span className="admin-sidebar-label min-w-0 flex-1 truncate">{item.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'tabular admin-sidebar-label grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold',
                      'bg-danger text-white'
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="admin-only-collapsed absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface"
                  />
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Brand({ compact }) {
  return (
    <Link
      href="/admin"
      className="flex h-14 shrink-0 items-center gap-2.5 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-700 text-sm font-extrabold text-white shadow-brand">
        H
      </span>
      <span className={cn('min-w-0', compact && 'admin-sidebar-label')}>
        <span className="block truncate font-display text-sm font-extrabold tracking-tight text-foreground">
          Hostello
        </span>
        <span className="block truncate text-[10px] font-semibold tracking-widest text-brand-700 uppercase dark:text-brand-300">
          Admin console
        </span>
      </span>
    </Link>
  );
}

export default function AdminShell({ session, counts, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const bellRef = useRef(null);
  const menuRef = useRef(null);

  const total =
    (counts?.payments || 0) + (counts?.listings || 0) + (counts?.reviews || 0);

  useEffect(() => {
    setMobileOpen(false);
    setBellOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setBellOpen(false);
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    const root = document.documentElement;
    const next = root.dataset.adminSidebar === 'collapsed' ? 'expanded' : 'collapsed';
    root.dataset.adminSidebar = next;
    try {
      localStorage.setItem('hostello-admin-sidebar', next);
    } catch {
      /* private mode; the preference simply doesn't persist */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const dark = root.classList.toggle('dark');
    try {
      localStorage.setItem('hostello-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    await apiSend('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  const attention = [
    {
      key: 'payments',
      label: 'Payments awaiting approval',
      href: '/admin/payments',
      count: counts?.payments || 0,
      icon: Wallet,
    },
    {
      key: 'listings',
      label: 'Listings in review',
      href: '/admin/listings?status=pending_review',
      count: counts?.listings || 0,
      icon: Building2,
    },
    {
      key: 'reviews',
      label: 'Flagged reviews',
      href: '/admin/reviews?status=flagged',
      count: counts?.reviews || 0,
      icon: Star,
    },
  ];

  return (
    <div className="admin-scope flex min-h-dvh bg-surface-sunken">
      {/* ── Desktop sidebar ── */}
      <aside className="admin-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex">
        <Brand compact />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} counts={counts} />
        </div>
        <div className="shrink-0 border-t border-border p-2.5">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse or expand the sidebar"
            className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <PanelLeftClose className="admin-only-expanded size-4.5 shrink-0" aria-hidden="true" />
            <PanelLeft className="admin-only-collapsed size-4.5 shrink-0" aria-hidden="true" />
            <span className="admin-sidebar-label">Collapse</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile slide-over ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-80 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="animate-fade-in absolute inset-0 cursor-default bg-[var(--overlay)]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="animate-fade-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="mr-2 grid size-10 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList
                pathname={pathname}
                counts={counts}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* Notification bell */}
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setBellOpen((v) => !v);
                  setMenuOpen(false);
                }}
                aria-expanded={bellOpen}
                aria-haspopup="menu"
                aria-label={
                  total > 0 ? `${total} items need your attention` : 'Nothing needs attention'
                }
                className="relative grid size-10 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Bell className="size-5" aria-hidden="true" />
                {total > 0 && (
                  <span className="tabular absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                    {total > 9 ? '9+' : total}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 rounded-[var(--radius-card)] border border-border bg-surface-raised p-1.5 shadow-xl">
                  <p className="px-2.5 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Needs your attention
                  </p>
                  {total === 0 ? (
                    <div className="flex items-center gap-2.5 px-2.5 py-3 text-sm text-muted-foreground">
                      <Inbox className="size-4" aria-hidden="true" />
                      The queue is clear.
                    </div>
                  ) : (
                    attention
                      .filter((a) => a.count > 0)
                      .map((a) => {
                        const Icon = a.icon;
                        return (
                          <Link
                            key={a.key}
                            href={a.href}
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300">
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {a.label}
                            </span>
                            <Badge tone="danger" size="sm" className="tabular shrink-0">
                              {a.count}
                            </Badge>
                          </Link>
                        );
                      })
                  )}
                </div>
              )}
            </div>

            {/* Avatar menu */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setBellOpen(false);
                }}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex h-10 cursor-pointer items-center gap-2 rounded-lg pl-1 pr-2 transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar name={session?.name || session?.email} size="sm" />
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-32 truncate text-xs font-semibold text-foreground">
                    {session?.name || 'Admin'}
                  </span>
                  <span className="block text-[10px] font-medium tracking-wide text-brand-700 uppercase dark:text-brand-300">
                    Admin
                  </span>
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius-card)] border border-border bg-surface-raised p-1.5 shadow-xl"
                >
                  <div className="border-b border-border px-2.5 pb-2.5 pt-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {session?.name || 'Admin'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={toggleTheme}
                    className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Moon className="admin-only-light size-4 shrink-0" aria-hidden="true" />
                    <Sun className="admin-only-dark size-4 shrink-0" aria-hidden="true" />
                    <span className="admin-only-light">Switch to dark mode</span>
                    <span className="admin-only-dark">Switch to light mode</span>
                  </button>

                  <Link
                    href="/"
                    role="menuitem"
                    className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Globe className="size-4 shrink-0" aria-hidden="true" />
                    View public site
                  </Link>

                  <Link
                    href="/admin/settings"
                    role="menuitem"
                    className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />
                    Platform settings
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-danger transition-colors duration-150 hover:bg-danger-soft disabled:opacity-60 dark:hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <LogOut className="size-4 shrink-0" aria-hidden="true" />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
