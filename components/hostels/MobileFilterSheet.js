'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import FilterPanel from './FilterPanel';
import { useDialog } from './use-dialog';
import { DEFAULT_FILTERS, activeFilterCount, hostelsHref } from './filters';

/**
 * Mobile / tablet filtering. The trigger carries the live active-filter count;
 * the sheet edits a buffered draft so nothing reloads until "Show results",
 * which is the right trade-off on a connection where every navigation costs.
 */
export default function MobileFilterSheet({ filters, facets, className }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const panelRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);
  useDialog(open, { ref: panelRef, onClose: close });

  const liveCount = activeFilterCount(filters);
  const draftCount = activeFilterCount(draft);

  function openSheet() {
    setDraft(filters);
    setOpen(true);
  }

  function applyDraft() {
    setOpen(false);
    startTransition(() =>
      router.push(hostelsHref({ ...draft, sort: filters.sort, view: filters.view, page: 1 }), {
        scroll: false,
      })
    );
  }

  function resetDraft() {
    setDraft({ ...DEFAULT_FILTERS, sort: filters.sort, view: filters.view });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-4',
          'text-sm font-medium text-foreground shadow-sm transition-colors duration-200',
          'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {liveCount > 0 && (
          <span className="tabular grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
            {liveCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-pointer bg-[var(--overlay)] animate-fade-in"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter hostels"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[var(--radius-panel)] border-t border-border bg-surface shadow-xl outline-none animate-fade-up"
          >
            <div className="shrink-0 border-b border-border px-5 pb-3 pt-3">
              <div
                aria-hidden="true"
                className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong"
              />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  Filters
                  {draftCount > 0 && (
                    <span className="tabular ml-2 text-sm font-normal text-muted-foreground">
                      {draftCount} active
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close filters"
                  className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterPanel value={draft} facets={facets} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
            </div>

            <div className="shrink-0 border-t border-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={resetDraft}
                  disabled={draftCount === 0}
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-[1.4]"
                  onClick={applyDraft}
                  loading={isPending}
                >
                  Show results
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
