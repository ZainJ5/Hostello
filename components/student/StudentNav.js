'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, CalendarCheck, LayoutDashboard, Star, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/bookings', label: 'My Bookings', icon: CalendarCheck },
  { href: '/dashboard/saved', label: 'Saved', icon: Bookmark },
  { href: '/dashboard/reviews', label: 'My Reviews', icon: Star },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
];

/**
 * Horizontal tab rail. Students have five sections, so a slim strip under the
 * header is used instead of the sidebar the owner and admin consoles need. It
 * collapses to a scrollable rail at 375px without hiding anything behind a
 * menu.
 */
export default function StudentNav({ counts = {} }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account sections" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            const count = counts[tab.href];

            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-12 cursor-pointer items-center gap-2 rounded-t-lg px-3 text-sm font-medium whitespace-nowrap',
                    'transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {tab.label}
                  {count > 0 && (
                    <span className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-50 px-1.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                      {count}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors duration-200',
                      active ? 'bg-brand-600' : 'bg-transparent group-hover:bg-border-strong'
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
