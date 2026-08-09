import Link from 'next/link';
import { cn } from '@/lib/utils';
import { withoutSlug } from './selection';

/**
 * The comparison itself, from compare 98:7699.
 *
 * The same rows in the same order for every column, so a gap is legible as a
 * gap. Figures are set in mono with tabular numerals, which is what lets a
 * reader compare 18,000 against 16,000 without reading either of them.
 *
 * The frame fits three truncated columns onto a 390 screen, where cells read
 * "Not con..." and "a short r...". A cell that cannot be read is not a
 * comparison, so the table scrolls sideways instead and the label column stays
 * pinned to the left edge. Nothing is clipped at any width.
 */

const HEAD_CELL = 'sticky top-0 z-10 bg-ds-surface-sunken px-4 py-3 text-left align-bottom';

export default function CompareTable({ hostels, rows, selection }) {
  return (
    <div className="ds-elevated w-full overflow-x-auto rounded-ds-inner">
      <table className="w-full min-w-[40rem] border-collapse">
        <caption className="sr-only">
          {hostels.length} hostels compared on rent, location, who can stay, facilities and the
          verified badge
        </caption>

        <thead>
          <tr>
            <th scope="col" className={cn(HEAD_CELL, 'sticky left-0 w-44 min-w-44')}>
              <span className="sr-only">Field</span>
            </th>
            {hostels.map((h) => (
              <th key={h.slug} scope="col" className={cn(HEAD_CELL, 'min-w-52')}>
                <div className="flex flex-col items-start gap-1">
                  <Link
                    href={`/hostels/${h.slug}`}
                    className="ds-body-m-strong text-ds-ink hover:text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    {h.name}
                  </Link>
                  <Link
                    href={withoutSlug(selection, h.slug)}
                    className="ds-body-s text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    Remove
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-solid border-ds-hairline">
              <th
                scope="row"
                className="sticky left-0 bg-ds-surface-raised px-4 py-3 text-left align-top"
              >
                <span className="ds-body-s text-ds-ink">{row.label}</span>
              </th>
              {row.cells.map((c, i) => (
                <td key={`${row.label}-${hostels[i]?.slug || i}`} className="px-4 py-3 text-right align-top">
                  <span
                    className={cn(
                      c.mono ? 'ds-mono-table' : 'ds-body-s',
                      c.muted ? 'text-ds-ink-muted' : 'text-ds-ink'
                    )}
                  >
                    {c.text}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
