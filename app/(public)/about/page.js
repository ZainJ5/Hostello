import Link from 'next/link';
import { ArrowRight, BadgeCheck, MessageCircle, Receipt, ShieldCheck } from 'lucide-react';
import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import Button from '@/components/ui/Button';
import Container from '@/components/public/Container';

export const metadata = {
  title: 'About',
  description:
    'Hostello is a directory of verified student hostels across Pakistan. How listings are checked, what the Verified badge means, and why there is never a broker fee.',
};

const CHECKS = [
  {
    icon: ShieldCheck,
    title: 'A person reads every submission',
    body: 'Address, room types, rents, photos and contact details are checked against each other before a listing can appear in search. Anything that does not add up goes back to the owner with a reason.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified means confirmed, not claimed',
    body: 'The badge is only applied once we have confirmed the hostel exists at the address given and that the listed number is answered by the owner or warden — not an agent reselling the room.',
  },
  {
    icon: MessageCircle,
    title: 'Reviews stay with the student',
    body: 'Ratings come from account holders on Hostello. An owner can reply to a review, but cannot remove one, and we do not sell placement in search results.',
  },
  {
    icon: Receipt,
    title: 'You pay the hostel, never us',
    body: 'Hostello takes no commission on your rent and charges no finder’s fee. Owners pay a flat fee to list; students pay nothing at all.',
  },
];

async function loadStats() {
  try {
    await connectDB();
    const [row] = await Hostel.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$verified', 1, 0] } },
          reviews: { $sum: '$reviewCount' },
          cities: { $addToSet: '$city' },
        },
      },
    ]);
    return {
      total: row?.total || 0,
      verified: row?.verified || 0,
      reviews: row?.reviews || 0,
      cities: row?.cities?.length || 0,
    };
  } catch (error) {
    console.error('[about] could not load stats:', error?.message || error);
    return { total: 0, verified: 0, reviews: 0, cities: 0 };
  }
}

export default async function AboutPage() {
  const stats = await loadStats();

  const figures = [
    { label: 'Listings published', value: stats.total },
    { label: 'Carrying the Verified badge', value: stats.verified },
    { label: 'Student reviews', value: stats.reviews },
    { label: 'Cities covered', value: stats.cities },
  ];

  return (
    <>
      {/* ══════════ Header ══════════ */}
      <section className="relative isolate overflow-hidden border-b border-border bg-surface">
        <div
          aria-hidden="true"
          className="bg-grid pointer-events-none absolute inset-0"
          style={{
            maskImage: 'radial-gradient(60% 70% at 50% 0%, #000 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(60% 70% at 50% 0%, #000 20%, transparent 100%)',
          }}
        />
        <Container width="narrow" className="relative py-16 sm:py-20 lg:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
            About Hostello
          </p>
          <h1 className="mt-3 text-h1 text-balance text-foreground">
            Finding a hostel should not depend on who you know
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            Most students in Pakistan still find their room through a WhatsApp forward, a Facebook
            group or a cousin who studied here two years ago. You arrive, you look at one room, and
            you sign — with no idea what the rent should be or whether the photos were real.
          </p>
        </Container>
      </section>

      {/* ══════════ Story ══════════ */}
      <section className="py-16 sm:py-20">
        <Container width="narrow">
          <div className="space-y-10">
            <div>
              <h2 className="text-h2 text-balance text-foreground">What Hostello is</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
                Hostello is a public directory of student hostels, organised the way students
                actually search: by campus first, then by city, gender and budget. Each listing
                carries the same information in the same place — photos, room types, rent, security
                deposit, facilities, mess menu, house rules, distance to campus and reviews — so two
                hostels can genuinely be compared instead of guessed at.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
                We are not an agency and we do not hold rooms. When you find something you like, you
                contact the hostel yourself, visit it yourself, and deal with the owner directly.
              </p>
            </div>

            <div>
              <h2 className="text-h2 text-balance text-foreground">How a listing gets on the site</h2>
              <ul className="mt-6 space-y-4">
                {CHECKS.map((check) => (
                  <li
                    key={check.title}
                    className="flex gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      <check.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground">{check.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {check.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-h2 text-balance text-foreground">Where we are today</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
                Coverage started in Islamabad and Rawalpindi, around NUST, FAST, QAU, COMSATS, NUML,
                Arid Agriculture, Bahria, Riphah, RMU and FJWU, and is expanding into Lahore and
                Karachi.
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-border bg-border sm:grid-cols-4">
                {figures.map((figure) => (
                  <div key={figure.label} className="flex flex-col bg-surface p-5">
                    <dt className="order-2 mt-1 text-sm text-muted-foreground text-pretty">
                      {figure.label}
                    </dt>
                    <dd className="tabular order-1 text-2xl font-bold text-foreground">
                      {figure.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="text-h2 text-balance text-foreground">Something wrong with a listing?</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
                If a rent is out of date, a photo does not match the room, or a hostel has closed,
                tell us at{' '}
                <a
                  href="mailto:hello@hostello.tech"
                  className="font-medium text-brand-700 underline underline-offset-4 transition-colors duration-200 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                >
                  hello@hostello.tech
                </a>{' '}
                and we will check it. Reports about safety are handled the same day.
              </p>
            </div>
          </div>

          {/* ══════════ CTA ══════════ */}
          <div className="mt-14 flex flex-col gap-4 rounded-[var(--radius-panel)] border border-border bg-surface-sunken p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-h3 text-foreground">Ready to look?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                Browse the full directory, or list a hostel you own.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/hostels">
                Browse hostels
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button href="/owner" variant="secondary">
                List your hostel
              </Button>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Looking for the map instead?{' '}
            <Link
              href="/map"
              className="font-medium text-brand-700 underline underline-offset-4 transition-colors duration-200 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
            >
              Open every hostel on a map
            </Link>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
