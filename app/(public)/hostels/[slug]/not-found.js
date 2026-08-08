import { Compass, Search } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Reached when a slug doesn't exist, or when the listing behind it is no longer
 * published — a hostel that was suspended or pulled looks identical to one that
 * never existed, which is deliberate: we don't leak moderation state.
 */
export default function HostelNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
        <Compass className="size-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-h2 text-balance text-foreground">
        This listing isn&apos;t available
      </h1>
      <p className="mt-3 text-base text-pretty text-muted-foreground">
        It may have been taken down by the owner, or the link might have a typo
        in it. There are 124 other published hostels waiting — try searching by
        city or university instead.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button href="/hostels" variant="primary" size="lg">
          <Search className="size-4" aria-hidden="true" />
          Browse all hostels
        </Button>
        <Button href="/hostels?city=Islamabad" variant="secondary" size="lg">
          Hostels in Islamabad
        </Button>
      </div>

      <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {['NUST', 'FAST', 'QAU', 'COMSATS', 'NUML', 'Riphah'].map((u) => (
          <li key={u}>
            <Button href={`/hostels?university=${encodeURIComponent(u)}`} variant="ghost" size="sm">
              Near {u}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
