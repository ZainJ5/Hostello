import { cn } from '@/lib/utils';

/**
 * The score and the five bars from the reviews frame 94:5045.
 *
 * EVERY NUMBER HERE IS COUNTED FROM REVIEW DOCUMENTS, never from the legacy
 * `rating` and `reviewCount` on a listing. 62 of 124 listings carry a legacy
 * count while the Review collection is empty, so a bar chart built from those
 * fields would draw five bars over reviews that do not exist.
 *
 * The component therefore renders nothing at all when `total` is zero. The
 * caller shows an empty state instead, which is the honest answer.
 *
 * The bars are the same solid versus hollow grammar as the badge and the bed
 * strip: a filled ink track over a hairline outlined one. Width is a
 * percentage of the largest band rather than of the total, because with 104
 * fives and 1 one the true proportions collapse the bottom four rows to
 * nothing and the distribution stops being readable.
 */
export default function RatingSummary({ average, total, distribution, note, className }) {
  if (!total) return null;

  const peak = Math.max(1, ...[5, 4, 3, 2, 1].map((n) => distribution?.[n] || 0));

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="ds-display-xl text-ds-ink">
          <span aria-hidden="true">{Number(average || 0).toFixed(1)}</span>
          <span className="sr-only">
            {Number(average || 0).toFixed(1)} out of 5, from {total}{' '}
            {total === 1 ? 'review' : 'reviews'}
          </span>
        </p>
        {note ? <p className="ds-body-s max-w-[60ch] text-ds-ink-muted">{note}</p> : null}
      </div>

      <table className="w-full border-separate border-spacing-y-1">
        <caption className="sr-only">How the ratings are spread</caption>
        <tbody>
          {[5, 4, 3, 2, 1].map((band) => {
            const count = distribution?.[band] || 0;
            const width = `${Math.round((count / peak) * 100)}%`;

            return (
              <tr key={band}>
                <th scope="row" className="ds-mono-table w-8 text-left font-normal text-ds-ink">
                  {band}
                </th>
                <td className="w-full px-2">
                  <span className="flex h-2 w-full overflow-hidden rounded-ds-chip border border-solid border-ds-hairline bg-ds-surface-raised">
                    <span
                      aria-hidden="true"
                      style={{ width }}
                      className="block h-full bg-ds-ink"
                    />
                  </span>
                </td>
                <td className="ds-mono-table w-12 text-right text-ds-ink">{count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
