'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

/** Peek (count only) → half → almost full, as a fraction of the map area. */
export const SHEET_SNAPS = [0.17, 0.55, 0.94];
const SHEET_MAX = SHEET_SNAPS[SHEET_SNAPS.length - 1];

const offsetPct = (index) => ((SHEET_MAX - SHEET_SNAPS[index]) / SHEET_MAX) * 100;

/**
 * Draggable results sheet for the mobile layout.
 *
 * Dragging writes `transform` straight to the node (no React state per
 * pointermove) and only commits a snap index on release.
 */
export default function BottomSheet({ snapIndex, onSnapIndexChange, label, children }) {
  const sheetRef = useRef(null);
  const dragRef = useRef(null);

  const clampOffset = (px, height) => {
    const max = ((SHEET_MAX - SHEET_SNAPS[0]) / SHEET_MAX) * height;
    return Math.min(max, Math.max(0, px));
  };

  const handlePointerDown = (e) => {
    const sheet = sheetRef.current;
    if (!sheet || e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const height = sheet.offsetHeight;
    dragRef.current = {
      startY: e.clientY,
      startOffset: (offsetPct(snapIndex) / 100) * height,
      height,
      moved: false,
    };
    sheet.style.transition = 'none';
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    const delta = e.clientY - drag.startY;
    if (Math.abs(delta) > 4) drag.moved = true;
    sheet.style.transform = `translateY(${clampOffset(drag.startOffset + delta, drag.height)}px)`;
  };

  const endDrag = (e) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    dragRef.current = null;
    sheet.style.transition = '';

    let next;
    if (!drag.moved) {
      // A tap on the handle cycles through the snap points.
      next = (snapIndex + 1) % SHEET_SNAPS.length;
    } else {
      const offset = clampOffset(drag.startOffset + (e.clientY - drag.startY), drag.height);
      const fraction = SHEET_MAX - (offset / drag.height) * SHEET_MAX;
      next = SHEET_SNAPS.reduce(
        (best, snap, i) =>
          Math.abs(snap - fraction) < Math.abs(SHEET_SNAPS[best] - fraction) ? i : best,
        0
      );
    }

    // Keep the DOM in step with the state React is about to commit; if the
    // index is unchanged React would not re-apply the style on its own.
    sheet.style.transform = `translateY(${offsetPct(next)}%)`;
    onSnapIndexChange(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      onSnapIndexChange(Math.min(SHEET_SNAPS.length - 1, snapIndex + 1));
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      onSnapIndexChange(Math.max(0, snapIndex - 1));
    }
  };

  return (
    <section
      ref={sheetRef}
      aria-label={label}
      style={{ transform: `translateY(${offsetPct(snapIndex)}%)` }}
      className={cn(
        'absolute inset-x-0 bottom-0 z-[1200] flex h-[94%] flex-col lg:hidden',
        'rounded-t-[var(--radius-panel)] border border-b-0 border-border bg-surface shadow-xl',
        'transition-transform duration-300 ease-[var(--ease-out-quint)]'
      )}
    >
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        aria-label="Resize the results panel. Use the up and down arrow keys, or drag."
        className={cn(
          'flex h-9 w-full shrink-0 cursor-grab touch-none items-center justify-center',
          'rounded-t-[var(--radius-panel)] active:cursor-grabbing',
          'focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring'
        )}
      >
        <span aria-hidden="true" className="h-1.5 w-11 rounded-full bg-border-strong" />
      </button>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
    </section>
  );
}
