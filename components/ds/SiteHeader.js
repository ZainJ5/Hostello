'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Button from './Button';
import ThemeToggle from '@/components/public/ThemeToggle';
import { cn } from '@/lib/utils';

/**
 * Figma site-header 73:66, four variants.
 *
 * This is a website, not an app, so every page carries the same header and
 * there is no tab bar anywhere in the design.
 *
 * NAV SET, AND WHY IT IS NOT THE LIVE ONE. The live nav is Browse hostels,
 * Map, List your hostel, About. That predates roommate matching and community
 * and left eight built pages with no route in from anywhere, which is the two
 * things that make this product different from every other directory. Map
 * comes out because it is already a view toggle on browse. About comes out
 * because it sits in the footer on every page and is read once. Roommates and
 * Community go in, because a pillar with no route is not a pillar. List your
 * hostel stays because it is the only revenue route on the site.
 *
 * The mobile menu carries the identical set plus About and Sign in, because a
 * nav that only exists at 1440 is the same bug in a different place.
 */

const NAV = [
  { href: '/hostels', label: 'Browse hostels' },
  // The design drops Map, on the grounds that it is already a view toggle on
  // browse. It is back at the client's request: the map is a different way of
  // searching rather than a different way of listing, and it had no route in.
  { href: '/map', label: 'Map' },
  { href: '/roommates', label: 'Roommates' },
  { href: '/community', label: 'Community' },
  { href: '/list-your-hostel', label: 'List your hostel' },
];

const MOBILE_EXTRA = [
  { href: '/about', label: 'About' },
  { href: '/login', label: 'Sign in' },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader({ user = null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';

  const navLink = (item, mobile = false) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
          mobile
            ? 'flex w-full items-center border-b border-solid border-ds-hairline py-3'
            : 'inline-flex items-center',
          active ? 'ds-body-m-strong text-ds-ink' : 'ds-body-m text-ds-ink-muted hover:text-ds-ink'
        )}
        style={mobile ? { minHeight: 'var(--ds-control-h)' } : undefined}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <header className="w-full border-b border-solid border-ds-hairline bg-ds-surface">
      <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 lg:gap-8 sm:px-6 lg:px-10"
        style={{ minHeight: 'var(--ds-control-h)' }}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
        >
          <Logo height={28} />
          <span className="sr-only">Hostello home</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden min-w-px flex-1 items-center gap-6 lg:flex">
          {NAV.map((i) => navLink(i))}
        </nav>

        <div className="flex flex-1 justify-end lg:hidden" />

        <ThemeToggle />

        {/* Desktop account area */}
        <div className="hidden shrink-0 items-center gap-6 lg:flex">
          {user ? (
            <>
              <Link
                href="/account/saved"
                className="ds-body-m text-ds-ink-muted hover:text-ds-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                Saved and enquiries
              </Link>
              <Button href="/account/profile" variant="secondary">
                {user.name}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="ds-body-m text-ds-ink-muted hover:text-ds-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                Sign in
              </Link>
              <Button href="/signup">Get started</Button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          className={cn(
            'ds-body-m-strong inline-flex shrink-0 cursor-pointer items-center justify-center px-3 lg:hidden',
            'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
          )}
          style={{ height: 'var(--ds-control-h)' }}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div id="site-menu" className="bg-ds-surface px-4 pb-5 pt-2 lg:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((i) => navLink(i, true))}
            {MOBILE_EXTRA.map((i) => navLink(i, true))}
          </nav>
          <Button href="/signup" className="mt-4 w-full">
            Get started
          </Button>
        </div>
      ) : null}
    </header>
  );
}
