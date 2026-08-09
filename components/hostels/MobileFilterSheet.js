'use client';

import { useCallback, useRef, useState } from 'react';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import { useDialog } from './use-dialog';

/**
 * The phone side of the filter rail. Figma page/browse-hostels/390 77:1367
 * puts a "Filters" control beside the sort select; the rail itself moves into
 * a sheet.
 *
 * The rail is passed in as `children` and is still the same server rendered,
 * link driven markup the desktop rail uses, so there is exactly one filter UI
 * in the codebase and the two cannot drift.
 *
 * The sheet deliberately stays open when a row is tapped. Each tap is a real
 * navigation, the counts come back updated, and a student narrowing on rent
 * and then on mess would otherwise have to reopen the sheet between every
 * decision. "Show results" is what closes it.
 */
export default function MobileFilterSheet({ count = 0, children, className }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);

  useDialog(open, { ref: panelRef, onClose: close });

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'ds-body-m-strong inline-flex cursor-pointer items-center gap-2 px-4',
          'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
          'transition-colors duration-150 motion-reduce:transition-none hover:border-ds-cobalt',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
        )}
        style={{ height: 'var(--ds-control-h)' }}
      >
        Filters
        {count > 0 ? <span className="ds-mono-meta text-ds-ink-muted">{count}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close filters"
            onClick={close}
            className="absolute inset-0 cursor-pointer bg-(--overlay)"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter hostels"
            tabIndex={-1}
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col outline-none',
              'border-t border-solid border-ds-hairline bg-ds-surface'
            )}
            style={{ boxShadow: 'var(--ds-shadow-menu)' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-solid border-ds-hairline px-4 py-3">
              <h2 className="ds-display-s text-ds-ink">Filters</h2>
              <button
                type="button"
                onClick={close}
                className={cn(
                  'ds-body-m-strong ds-tap inline-flex cursor-pointer items-center justify-center px-3',
                  'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised text-ds-ink',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
                )}
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
              {children}
            </div>

            <div className="shrink-0 border-t border-solid border-ds-hairline px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <Button onClick={close} className="w-full">
                Show results
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
