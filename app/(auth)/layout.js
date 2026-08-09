import Link from 'next/link';
import {
  BadgeCheck,
  GraduationCap,
  Banknote,
  MessageCircle,
  ArrowLeft,
} from 'lucide-react';

/**
 * Split-screen auth shell: brand panel on the left from `lg` up, form column
 * on the right. Below `lg` the panel collapses to a compact header so the
 * keyboard never pushes the form off screen on a 375px phone.
 */

const PROOF_POINTS = [
  {
    icon: BadgeCheck,
    title: '124 hostels listed, 95 verified',
    body: 'A verified listing has been checked by our team, so there are no ghost rooms and no bait prices.',
  },
  {
    icon: GraduationCap,
    title: 'Mapped to 18 campuses',
    body: 'NUST, FAST, QAU, COMSATS, NUML, LUMS, UET and more, sorted by walking distance.',
  },
  {
    icon: Banknote,
    title: 'Real rents, PKR 5,000–35,000',
    body: 'Room-by-room pricing with the security deposit shown up front. No brokerage.',
  },
  {
    icon: MessageCircle,
    title: 'Talk to the owner directly',
    body: 'Call or WhatsApp the hostel from the listing. No agent sitting in the middle.',
  },
];

// These figures describe the imported catalogue. Recheck them against the
// database if the number of published listings changes materially.
const STATS = [
  { value: '124', label: 'Hostels listed' },
  { value: '18', label: 'Universities' },
  { value: '4', label: 'Cities' },
];

function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 font-display text-lg font-extrabold text-white ring-1 ring-white/25"
      >
        H
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-white">
        Hostello
      </span>
    </span>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
      {/* ── Compact brand header (below lg) ───────────────────────────── */}
      <header className="relative isolate overflow-hidden bg-linear-to-br from-brand-800 via-brand-700 to-brand-900 lg:hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 [background:radial-gradient(80%_140%_at_85%_0%,rgb(255_255_255/0.22),transparent_65%)]"
        />
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="cursor-pointer rounded-xl transition-opacity duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Wordmark />
            <span className="sr-only">Hostello home</span>
          </Link>
          <p className="hidden text-right text-xs leading-snug font-medium text-white/85 sm:block">
            124 hostels listed
            <br />
            near 18 campuses
          </p>
        </div>
      </header>

      {/* ── Brand panel (lg and up) ───────────────────────────────────── */}
      <aside className="relative isolate hidden overflow-hidden bg-linear-to-br from-brand-800 via-brand-700 to-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-80 [background:radial-gradient(65%_55%_at_18%_8%,rgb(255_255_255/0.20),transparent_62%),radial-gradient(55%_45%_at_92%_96%,rgb(45_212_191/0.30),transparent_60%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(to_right,rgb(255_255_255/0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.5)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]"
        />

        <Link
          href="/"
          className="w-fit cursor-pointer rounded-xl transition-opacity duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Wordmark />
          <span className="sr-only">Hostello home</span>
        </Link>

        <div className="max-w-md py-10">
          <h2 className="text-h2 text-balance text-white">
            Find the room, not just a bed.
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-pretty text-white/80">
            Hostello is where students across Pakistan compare hostels on the things
            that actually decide it: rent, distance, mess, and who else lives there.
          </p>

          <ul className="mt-9 space-y-6">
            {PROOF_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-brand-100 ring-1 ring-white/20"
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-pretty text-white/70">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-3 gap-4 border-t border-white/15 pt-7">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="tabular block font-display text-2xl font-extrabold text-white">
                  {value}
                </span>
                <span className="mt-0.5 block text-xs font-medium tracking-wide text-white/65 uppercase">
                  {label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* ── Form column ───────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="w-full max-w-[26rem]">{children}</div>

        <p className="mt-10 w-full max-w-[26rem] text-xs text-muted-foreground">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Hostello
          </Link>
        </p>
      </main>
    </div>
  );
}
