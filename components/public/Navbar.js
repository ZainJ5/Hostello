'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bookmark,
  Building2,
  CalendarCheck,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';
import Container from './Container';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/hostels', label: 'Browse Hostels' },
  { href: '/map', label: 'Map' },
  { href: '/owner', label: 'List Your Hostel' },
  { href: '/about', label: 'About' },
];

/** Where each role goes from the avatar menu. */
const ROLE_LINKS = {
  student: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/bookings', label: 'My bookings', icon: CalendarCheck },
    { href: '/dashboard/saved', label: 'Saved hostels', icon: Bookmark },
  ],
  owner: [{ href: '/owner', label: 'Owner dashboard', icon: Building2 }],
  admin: [{ href: '/admin', label: 'Admin console', icon: ShieldCheck }],
};

const ROLE_LABELS = { student: 'Student', owner: 'Hostel owner', admin: 'Administrator' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar({ session = null }) {
  const pathname = usePathname() || '/';
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetShown, setSheetShown] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const menuRef = useRef(null);
  const sheetRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);

  const links = session ? ROLE_LINKS[session.role] || [] : [];

  // ─── Border only appears once the page has moved ───────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Avatar dropdown: outside click + Escape ───────────────────────────
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const closeSheet = useCallback(() => {
    setSheetShown(false);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setSheetMounted(false), 220);
  }, []);

  const openSheet = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setSheetMounted(true);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // ─── Mobile sheet: slide-in, scroll lock, focus trap, Escape ───────────
  useEffect(() => {
    if (!sheetMounted) return undefined;

    const frame = requestAnimationFrame(() => setSheetShown(true));
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const focusables = () => {
      const panel = sheetRef.current;
      if (!panel) return [];
      return Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
      );
    };

    const focusFrame = requestAnimationFrame(() => {
      const [first] = focusables();
      if (first) first.focus();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!sheetRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [sheetMounted, closeSheet]);

  // Navigating away closes everything without waiting on the exit transition.
  useEffect(() => {
    setMenuOpen(false);
    setSheetShown(false);
    setSheetMounted(false);
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Network failure still clears the client view; the cookie expires server-side.
    }
    setMenuOpen(false);
    setSheetMounted(false);
    setSigningOut(false);
    router.replace('/');
    router.refresh();
  }

  const displayName = session?.name || session?.email || 'Account';
  const firstName = String(displayName).split(/\s+/)[0];

  return (
    <>
      <header
        className={cn(
          'glass sticky top-0 z-40 border-b transition-[border-color,box-shadow] duration-300',
          scrolled ? 'border-border shadow-sm' : 'border-transparent'
        )}
      >
        <Container>
          <div className="flex h-16 items-center gap-3 lg:h-18 lg:gap-6">
            {/* ─── Wordmark ─── */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-brand">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
                Hostello
              </span>
            </Link>

            {/* ─── Primary nav ─── */}
            <nav aria-label="Primary" className="hidden lg:flex lg:items-center lg:gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors duration-200',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      active
                        ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* ─── Right rail ─── */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />

              {session ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className={cn(
                      'flex h-11 cursor-pointer items-center gap-2 rounded-full border py-1 pl-1 pr-2.5',
                      'transition-colors duration-200 hover:bg-muted',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      menuOpen ? 'border-border-strong bg-muted' : 'border-border'
                    )}
                  >
                    <Avatar name={displayName} size="sm" />
                    <span className="hidden max-w-24 truncate text-sm font-medium text-foreground sm:block">
                      {firstName}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        menuOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="Account"
                      className="animate-scale-in absolute right-0 top-full mt-2 w-64 origin-top-right rounded-[var(--radius-card)] border border-border bg-surface p-1.5 shadow-xl"
                    >
                      <div className="border-b border-border px-3 pb-3 pt-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ROLE_LABELS[session.role] || 'Member'}
                        </p>
                      </div>

                      <div className="py-1.5">
                        {links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            role="menuitem"
                            onClick={() => setMenuOpen(false)}
                            className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                          >
                            <link.icon className="size-4 shrink-0" aria-hidden="true" />
                            {link.label}
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-border pt-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          disabled={signingOut}
                          className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-danger/15"
                        >
                          <LogOut className="size-4 shrink-0" aria-hidden="true" />
                          {signingOut ? 'Signing out…' : 'Sign out'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
                    Sign in
                  </Button>
                  <Button href="/signup" className="hidden sm:inline-flex">
                    Get started
                  </Button>
                </>
              )}

              <button
                ref={triggerRef}
                type="button"
                onClick={openSheet}
                aria-expanded={sheetMounted}
                aria-controls="mobile-menu"
                aria-label="Open menu"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* ─── Mobile sheet ─── */}
      {sheetMounted && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={closeSheet}
            className={cn(
              'absolute inset-0 bg-[var(--overlay)] transition-opacity duration-200',
              sheetShown ? 'opacity-100' : 'opacity-0'
            )}
          />

          <div
            id="mobile-menu"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={cn(
              'absolute inset-y-0 right-0 flex h-dvh w-full max-w-sm flex-col border-l border-border bg-surface shadow-xl',
              'transition-transform duration-300 ease-out',
              sheetShown ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-display text-lg font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
                Hostello
              </span>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close menu"
                className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={closeSheet}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-12 items-center rounded-xl px-3 text-base font-medium transition-colors duration-200',
                          active
                            ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {session && links.length > 0 && (
                <>
                  <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {ROLE_LABELS[session.role] || 'Account'}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={closeSheet}
                          className="flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted"
                        >
                          <link.icon className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="shrink-0 border-t border-border p-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{session.email}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSignOut}
                    loading={signingOut}
                    className="h-11"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button href="/signup" size="lg" onClick={closeSheet}>
                    Get started
                  </Button>
                  <Button href="/login" variant="secondary" size="lg" onClick={closeSheet}>
                    Sign in
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
