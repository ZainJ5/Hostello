import Link from 'next/link';

import { cn } from '@/lib/utils';
import Avatar from '@/components/roommates/Avatar';
import MetaStrip from '@/components/roommates/MetaStrip';
import { AXES, compatAria } from '@/components/roommates/questions';

/**
 * Figma card/match 39:32.
 *
 * Four things and nothing else: who they are, what they study, the six axis
 * strip, and the one line they wrote about what they are looking for.
 *
 * There is no number on this card. The strip is drawn, and its sentence is
 * given to a screen reader, but neither a score nor a position is printed,
 * because a number a student cannot check is a number they will argue with.
 * The words are one click away on the match page, where there is room to say
 * which axis is which.
 *
 * The surname is not here either. It stays hidden until both students accept
 * an intro, which is why the profile stores "Ayesha K." and not the full name.
 */
export default function MatchCard({ match, className }) {
  const meta = [match.year, match.programme].filter(Boolean).join(', ');
  const segments = AXES.map((axis) => match.axes?.[axis] ?? 0);

  return (
    <Link
      href={`/roommates/matches/${match.id}`}
      className={cn(
        'ds-elevated flex flex-col gap-3 rounded-ds-inner p-3',
        'transition-colors duration-150 motion-reduce:transition-none',
        'hover:border-ds-cobalt',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
        className
      )}
    >
      <span className="flex items-center gap-3">
        <Avatar initials={match.initials} />
        <span className="flex min-w-0 flex-col">
          <span className="ds-body-m-strong truncate text-ds-ink">{match.displayName}</span>
          {meta ? (
            <span className="ds-body-s truncate text-ds-ink-muted">{meta}</span>
          ) : null}
        </span>
      </span>

      <MetaStrip segments={segments} label={compatAria(match.axes)} />

      {match.looking ? (
        <span className="ds-body-s truncate text-ds-ink-muted">{match.looking}</span>
      ) : null}
    </Link>
  );
}
