'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * The account rail. A wrapping row of pills on a phone, a column from lg up,
 * which is exactly what the 390 and 1440 frames do.
 *
 * Every item is a 44 tall control at radius 4 with a 1px keyline, and the
 * current section is a solid ink fill with inverse text. That is the same
 * solid versus hollow grammar as the filter chip and the status badge, so the
 * rail needs no new rule and no accent colour.
 *
 * Two items are here that the frames do not draw. Overview, because the design
 * has no frame for the account index but the page exists and works, and the
 * breadcrumb on every other frame links to it. Reviews, because the route
 * exists, is reachable and had no frame drawn either. Both are reported as
 * gaps in the file rather than inventions.
 */
const ITEMS = [
  { href: '/account', label: 'Overview', exact: true },
  { href: '/account/saved', label: 'Saved hostels' },
  { href: '/account/enquiries', label: 'Enquiries' },
  { href: '/account/reviews', label: 'Reviews' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/settings', label: 'Settings' },
];

export default function AccountNav({ className }) {
  const pathname = usePathname() || '';

  return (
    <nav aria-label="Account sections" className={className}>
      <ul className="flex flex-wrap gap-2 lg:flex-col">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex">
              <span
                className="flex rounded-ds-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt"
                style={{ padding: 'var(--ds-focus-gap)' }}
              >
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'ds-body-m-strong inline-flex w-full items-center rounded-ds-inner border border-solid px-3.5',
                    'transition-colors duration-150 focus:outline-none motion-reduce:transition-none',
                    active
                      ? 'border-ds-ink bg-ds-ink text-ds-on-ink'
                      : 'border-ds-control bg-ds-surface-raised text-ds-ink hover:border-ds-cobalt'
                  )}
                  style={{ minHeight: 'var(--ds-control-h)' }}
                >
                  {item.label}
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
