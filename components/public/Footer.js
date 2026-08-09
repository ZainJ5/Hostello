import Link from 'next/link';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import Container from './Container';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/hostels', label: 'Browse hostels' },
      { href: '/map', label: 'Map view' },
      { href: '/hostels?gender=Female', label: 'Girls hostels' },
      { href: '/hostels?gender=Male', label: 'Boys hostels' },
      { href: '/#how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'Universities',
    links: [
      { href: '/hostels?university=NUST', label: 'NUST' },
      { href: '/hostels?university=FAST', label: 'FAST' },
      { href: '/hostels?university=QAU', label: 'QAU' },
      { href: '/hostels?university=COMSATS', label: 'COMSATS' },
      { href: '/hostels?university=NUML', label: 'NUML' },
      { href: '/hostels?university=SZABIST', label: 'SZABIST' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Hostello' },
      { href: '/owner', label: 'List your hostel' },
      { href: '/login', label: 'Owner sign in' },
      { href: '/signup', label: 'Create an account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of use' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/safety', label: 'Safety guidelines' },
    ],
  },
];

const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

const LINK =
  'inline-flex items-center rounded-md py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-sunken">
      <Container>
        <div className="grid gap-10 py-14 md:grid-cols-12 lg:gap-8 lg:py-16">
          {/* ─── Brand ─── */}
          <div className="md:col-span-12 lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
                Hostello
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              Hostello is where students across Pakistan find a room they can trust, with verified
              listings, honest rents and reviews from people who actually lived there. No brokers,
              no hidden commission.
            </p>

            <ul className="mt-5 space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href="mailto:hello@hostello.tech"
                  className="rounded-md transition-colors duration-200 hover:text-foreground"
                >
                  hello@hostello.tech
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                <a
                  href="tel:+92512345678"
                  className="tabular rounded-md transition-colors duration-200 hover:text-foreground"
                >
                  +92 51 234 5678
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                Islamabad, Pakistan
              </li>
            </ul>
          </div>

          {/* ─── Link columns ─── */}
          <div className="grid grid-cols-2 gap-8 md:col-span-12 md:grid-cols-4 lg:col-span-8">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
                <ul className="mt-3 space-y-0.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link href={link.href} className={LINK}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* ─── Cities + copyright ─── */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Cities" className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="mr-1 text-sm font-medium text-foreground">Hostels in</span>
            {CITIES.map((city) => (
              <Link
                key={city}
                href={`/hostels?city=${encodeURIComponent(city)}`}
                className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {city}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hostello. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
