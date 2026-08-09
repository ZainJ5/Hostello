import { cn } from '@/lib/utils';
import { TITLE } from '@/components/public/type';
import Container from '@/components/public/Container';
import Button from '@/components/ds/Button';
import FilterChip from '@/components/ds/FilterChip';

/**
 * Reached when a slug does not exist, and when the listing behind it is no
 * longer published. A hostel that was suspended looks identical to one that
 * never existed, which is deliberate: it keeps moderation state from leaking
 * to anybody who can guess a URL.
 *
 * The page is a route back into the directory rather than an apology, because
 * a student who lands here still needs a room.
 */
const CAMPUSES = ['NUST', 'FAST', 'QAU', 'COMSATS', 'NUML', 'FJWU', 'Riphah'];

export default function HostelNotFound() {
  return (
    <Container as="section" className="flex flex-col gap-6 pb-20 pt-16">
      <h1 className={cn(TITLE, 'max-w-[20ch] text-balance text-ds-ink')}>
        This listing is not available
      </h1>
      <p className="ds-body-l max-w-[70ch] text-pretty text-ds-ink-muted">
        It may have been taken down by the owner, or the link may have a typo in it. The rest of
        the directory is still here, so try a city or a campus instead.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button href="/hostels">Browse all hostels</Button>
        <Button href="/hostels?city=Islamabad" variant="secondary">
          Hostels in Islamabad
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="ds-label text-ds-ink-muted">Start with a campus</p>
        <ul className="flex flex-wrap gap-1">
          {CAMPUSES.map((u) => (
            <li key={u}>
              <FilterChip href={`/hostels?university=${encodeURIComponent(u)}`}>{u}</FilterChip>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
