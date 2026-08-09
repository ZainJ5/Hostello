import { cn } from '@/lib/utils';

/**
 * The half height strip. Figma slot-strip/compatibility 37:33.
 *
 * Same grammar as the bed strip in components/ds/BedStrip.js: segments flex
 * fill so the shape stays comparable down a list, solid means yes and hollow
 * means no, and the words underneath say the same thing the drawing does.
 *
 * The one difference is the height, and it is the whole reason this is a
 * separate component. A bed strip is `--ds-strip-bed`, twelve pixels. This is
 * `--ds-strip-meta`, six. Two strips can appear on one screen, and at the same
 * height a reader would take one for the other. Half height is the signal that
 * this strip is about something else.
 *
 * The strip has exactly four meanings in this system and this component covers
 * three of them: compatibility across the six axes, answer coverage on the
 * questionnaire, and where an intro request has got to. Beds are the fourth
 * and they have their own component. Do not invent a fifth.
 *
 * A segment is never the only carrier of its meaning. Either `summary` is
 * rendered underneath, or `label` gives the same sentence to a screen reader
 * where the layout has no room for it.
 */

/** 2 filled, 1 part filled, 0 hollow. Nothing else is a level. */
const FILL = { 2: '100%', 1: '55%', 0: '0%' };

function Segment({ level }) {
  const width = FILL[level] ?? '0%';
  return (
    <span
      aria-hidden="true"
      className="min-w-px flex-1 border border-solid border-ds-control bg-ds-surface"
      style={{ height: 'var(--ds-strip-meta)' }}
    >
      <span className="block h-full bg-ds-ink" style={{ width }} />
    </span>
  );
}

export default function MetaStrip({
  segments = [],
  labels = null,
  summary = '',
  label = '',
  className,
}) {
  if (!segments.length) return null;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div className="flex w-full gap-1" role="img" aria-label={label || summary}>
        {segments.map((level, i) => (
          <Segment key={i} level={level} />
        ))}
      </div>

      {labels ? (
        <div className="flex w-full gap-1" aria-hidden="true">
          {labels.map((text, i) => (
            <span key={i} className="ds-mono-meta min-w-px flex-1 truncate text-ds-ink-muted">
              {text}
            </span>
          ))}
        </div>
      ) : null}

      {summary ? <p className="ds-body-s text-ds-ink-muted">{summary}</p> : null}
    </div>
  );
}
