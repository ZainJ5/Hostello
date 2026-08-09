import Link from 'next/link';
import Logo from './Logo';

/**
 * Figma site-footer 73:156.
 *
 * Five link columns beside a brand block on desktop, stacking to two columns
 * and then one on a phone. The city row and the legal line sit below a
 * hairline.
 *
 * CONTACT IS HOSTELLO'S, NOT THE HOSTEL'S. Owner numbers live on each listing
 * and are the ones a student calls about a room. The support contact here is
 * labelled so the two can never be confused.
 *
 * The WhatsApp link drops the leading zero and carries the country code.
 * wa.me/03184308493 is a dead link and is the mistake that gets made.
 */

const SUPPORT = {
  email: 'team@xaviot.com',
  phoneDisplay: '0318 4308493',
  phoneHref: 'tel:+923184308493',
  whatsappHref: 'https://wa.me/923184308493',
};

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/hostels', label: 'Browse hostels' },
      { href: '/map', label: 'Map view' },
      { href: '/hostels?gender=Female', label: 'Girls hostels' },
      { href: '/hostels?gender=Male', label: 'Boys hostels' },
      { href: '/compare', label: 'Compare hostels' },
      { href: '/#how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'Universities',
    links: [
      { href: '/hostels/near/nust', label: 'NUST' },
      { href: '/hostels/near/fast', label: 'FAST' },
      { href: '/hostels/near/qau', label: 'QAU' },
      { href: '/hostels/near/comsats', label: 'COMSATS' },
      { href: '/hostels/near/numl', label: 'NUML' },
      { href: '/hostels/near/szabist', label: 'SZABIST' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Hostello' },
      { href: '/list-your-hostel', label: 'List your hostel' },
      { href: '/signup', label: 'Create an account' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of use' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/safety', label: 'Safety guidelines' },
      { href: '/report-listing', label: 'Report a listing' },
    ],
  },
  {
    title: 'Students',
    links: [
      { href: '/roommates', label: 'Find a roommate' },
      { href: '/roommates', label: 'How you live' },
      { href: '/community', label: 'Ask residents' },
      { href: '/notice-board', label: 'Notice board' },
      { href: '/hostels/near/fjwu', label: 'Starting at FJWU' },
    ],
  },
];

const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

const linkClass =
  'ds-body-s text-ds-ink-muted hover:text-ds-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-solid border-ds-hairline bg-ds-surface-sunken">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-10 px-4 py-12 lg:px-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Brand and support */}
          <div className="flex max-w-[34ch] flex-col gap-4">
            <Logo height={24} />
            <p className="ds-body-s text-ds-ink-muted">
              Hostello is where students across Pakistan find a room they can trust. Verified
              listings, honest rents and reviews from people who actually lived there. No brokers
              and no hidden commission.
            </p>

            <div className="flex flex-col gap-3">
              <p className="ds-body-s-strong text-ds-ink">Contact Hostello</p>

              <div className="flex flex-col gap-1">
                <a
                  href={`mailto:${SUPPORT.email}`}
                  className="ds-body-m-strong text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                >
                  {SUPPORT.email}
                </a>
                <p className="ds-body-s text-ds-ink-muted">
                  Email us about the site, a listing or a safety report
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={SUPPORT.phoneHref}
                    className="ds-body-m-strong text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    {SUPPORT.phoneDisplay}
                  </a>
                  <a
                    href={SUPPORT.whatsappHref}
                    className="ds-body-s text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    WhatsApp
                  </a>
                </div>
                <p className="ds-body-s text-ds-ink-muted">
                  Call or WhatsApp Hostello. Not the hostel: owner numbers are on each listing.
                </p>
              </div>

              <p className="ds-mono-meta text-ds-ink-muted">Islamabad, Pakistan</p>
            </div>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid min-w-px flex-1 grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5"
          >
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="ds-body-s-strong text-ds-ink">{col.title}</p>
                <ul className="flex flex-col gap-2">
                  {col.links.map((l) => (
                    <li key={`${col.title}-${l.label}`}>
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div aria-hidden="true" className="h-px w-full bg-ds-hairline" />

        <div className="flex flex-col gap-4">
          <p className="ds-body-s flex flex-wrap items-center gap-x-4 gap-y-2 text-ds-ink-muted">
            <span>Hostels in</span>
            {CITIES.map((c) => (
              <Link
                key={c}
                // `/hostels/<city>` would fall through to the listing route and
                // 404. The city landing pages live under `/hostels/in/`.
                href={`/hostels/in/${c.toLowerCase()}`}
                className="text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                {c}
              </Link>
            ))}
          </p>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="ds-mono-meta text-ds-ink-muted">
              {year} Hostello. All rights reserved.
            </p>
            <p className="ds-mono-meta text-ds-ink-muted">A product of xaviot.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
