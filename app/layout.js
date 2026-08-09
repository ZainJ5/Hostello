import { Inter } from 'next/font/google';
import './globals.css';

// One family carries the entire scale: display, body, navigation, microcopy.
// Inter is the documented open-source substitute for Airbnb Cereal VF.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
