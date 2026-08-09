import { cn } from '@/lib/utils';

/**
 * Answer coverage: the third of the four meanings the strip primitive carries,
 * after beds and compatibility and before request lifecycle. No fifth meaning
 * is invented anywhere in the community routes.
 *
 * Drawn at `--ds-strip-meta`, which is half the bed strip's height. The bed
 * strip is the signature of a listing card and has to hold the eye; coverage
 * is a summary above a page whose real content is the answers themselves, so
 * it reads as a rule rather than a headline.
 *
 * The grammar is the same solid versus hollow used by the bed strip and the
 * status badge: solid ink means the question has an answer, hollow means it is
 * still open. Nothing is dashed, because unlike bed occupancy there is no
 * unknown tier here. Either somebody has answered or nobody has, and the
 * product knows which.
 *
 * The drawing is aria-hidden and the caption underneath carries the same
 * information in words, so the strip is never the only way to read the page.
 */
export default function AnswerCoverageStrip({ coverage, className }) {
  if (!coverage?.segments?.length) return null;

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div aria-hidden="true" className="flex w-full flex-col gap-1.5">
        <div className="flex w-full gap-1.5">
          {coverage.segments.map((s) => (
            <span
              key={s.value}
              className={cn(
                'min-w-px flex-1 border border-solid',
                s.answered
                  ? 'border-ds-ink bg-ds-ink'
                  : 'border-ds-hairline bg-ds-surface'
              )}
              style={{ height: 'var(--ds-strip-meta)' }}
            />
          ))}
        </div>
        <div className="flex w-full gap-1.5">
          {coverage.segments.map((s) => (
            <span
              key={s.value}
              className="ds-mono-meta min-w-px flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-ds-ink-muted"
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <p className="ds-body-s max-w-[70ch] text-ds-ink-muted">{coverage.caption}</p>
    </div>
  );
}
