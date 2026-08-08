'use client';

import { memo } from 'react';
import { MapPinOff, ZoomOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import ResultCard from './ResultCard';

function ResultSkeleton() {
  return (
    <li className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-2.5">
      <Skeleton className="size-[92px] shrink-0 rounded-xl sm:size-[104px]" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    </li>
  );
}

/**
 * The keyboard-and-screen-reader path to the same data the map shows. Never
 * hidden behind the map: on mobile it is the bottom sheet, on desktop the left
 * column, and every row links out to the listing page.
 */
function ResultList({
  hostels,
  loading,
  selectedId,
  hoveredId,
  campus,
  hasFilters,
  idPrefix,
  onSelect,
  onHover,
  onZoomOut,
  onClearFilters,
}) {
  if (loading && hostels.length === 0) {
    return (
      <ul className="space-y-2.5 p-3 sm:p-4" aria-busy="true" aria-label="Loading hostels">
        {[0, 1, 2, 3, 4].map((i) => (
          <ResultSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (hostels.length === 0) {
    return (
      <div className="p-3 sm:p-4">
        <EmptyState
          icon={MapPinOff}
          title="No hostels in this area"
          description={
            hasFilters
              ? 'Nothing matches these filters inside the current map view. Try widening the area or relaxing a filter.'
              : 'Pan or zoom out to bring more of the twin cities into view.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="md" onClick={onZoomOut}>
                <ZoomOut className="size-4" aria-hidden="true" />
                Zoom out to all results
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="md" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <ul
      className="space-y-2.5 p-3 sm:p-4"
      aria-label={`${hostels.length} hostels in the current map view`}
    >
      {hostels.map((h) => (
        <ResultCard
          key={h._id}
          hostel={h}
          active={hoveredId === h._id}
          selected={selectedId === h._id}
          showDistance={Boolean(campus)}
          campusName={campus?.name}
          idPrefix={idPrefix}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </ul>
  );
}

export default memo(ResultList);
