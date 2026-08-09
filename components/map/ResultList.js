'use client';

import { memo } from 'react';
import Button from '@/components/ds/Button';
import { EmptyState, Skeleton } from '@/components/ds/Feedback';
import ResultCard from './ResultCard';

function ResultSkeleton() {
  return (
    <li className="ds-elevated flex gap-3 rounded-ds-inner p-3">
      <Skeleton className="size-22 shrink-0 sm:size-26" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-5 w-28" />
      </div>
    </li>
  );
}

/**
 * The keyboard and screen reader path to the same data the map shows. Never
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
      <ul className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading hostels">
        {[0, 1, 2, 3, 4].map((i) => (
          <ResultSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (hostels.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No hostels in this area"
          body={
            hasFilters
              ? 'Nothing matches these filters inside the current map view. Widening the area or relaxing a filter usually brings results straight back.'
              : 'Pan the map, or zoom out to bring more of the twin cities into view.'
          }
          action={
            <div className="flex flex-wrap items-center gap-1">
              <Button onClick={onZoomOut}>Zoom out to all results</Button>
              {hasFilters && (
                <Button variant="secondary" onClick={onClearFilters}>
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
      className="flex flex-col gap-3 p-4"
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
