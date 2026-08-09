import {
  Inter,
  Familjen_Grotesk,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';
import './globals.css';

// Inter still carries the admin and owner consoles, which keep the original
// Airbnb derived scale. It is left exactly as it was.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// The four faces the 2026 student site is drawn in. next/font self hosts them
// at build time, so there is no runtime request to a font CDN.
const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-familjen',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

// Reserved for genuinely tabular blocks, not for body copy.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-plex-mono',
  display: 'swap',
});

// Parent page labels only. Nastaliq needs roughly 2.2x the Latin line height,
// which the .ds-label-urdu class sets.
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['500'],
  variable: '--font-nastaliq',
  display: 'swap',
});

const fontVariables = [
  inter.variable,
  familjen.variable,
  plexSans.variable,
  plexMono.variable,
  nastaliq.variable,
].join(' ');

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hostello: Pakistan's Student Hostel Finder",
    template: '%s · Hostello',
  },
  description:
    'Compare verified student hostels near NUST, FAST, QAU, COMSATS, NUML and more. Real photos, real prices and real reviews, so you can find your room in minutes.',
  keywords: [
    'student hostel Pakistan',
    'hostel near NUST',
    'girls hostel Islamabad',
    'boys hostel Rawalpindi',
    'university accommodation Pakistan',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'Hostello',
    title: "Hostello: Pakistan's Student Hostel Finder",
    description:
      'Compare verified student hostels near Pakistan\'s top universities. Real photos, real prices, real reviews.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    // The inline theme script stamps `dark` and `color-scheme` onto <html>
    // before hydration, so the server markup intentionally differs from the
    // client DOM here. Suppression is scoped to this element's attributes and
    // does not extend to children.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
