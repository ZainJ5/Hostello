'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The scroll container. It owns both axes so a wide table never pushes the
 * page sideways and the header can stick to the top of the grid.
 */
export function TableWrap({ className, children, maxHeight = 'max-h-[68dvh]' }) {
  return (
    <div
      className={cn(
        'relative overflow-auto overscroll-x-contain rounded-[var(--radius-card)] border border-border bg-surface',
        maxHeight,
        className
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, minWidth = 'min-w-[62rem]' }) {
  return (
    <table
      className={cn('w-full border-separate border-spacing-0 text-sm', minWidth, className)}
    >
      {children}
    </table>
  );
}

export function THead({ children }) {
  return <thead className="sticky top-0 z-20">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

const HEAD_CELL =
  'sticky top-0 z-20 border-b border-border bg-surface-sunken/95 px-3 py-2.5 text-left ' +
  'text-[11px] font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur ' +
  'first:pl-4 last:pr-4';

export function Th({
  children,
  sortKey,
  activeSort,
  dir = 'desc',
  onSort,
  align = 'left',
  className,
  width,
}) {
  const active = sortKey && activeSort === sortKey;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(HEAD_CELL, align === 'right' && 'text-right', align === 'center' && 'text-center', className)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            'group -mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 uppercase',
            'transition-colors duration-200 hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            active && 'text-foreground',
            align === 'right' && 'flex-row-reverse'
          )}
        >
          {children}
          <Icon
            className={cn(
              'size-3 shrink-0 transition-opacity duration-200',
              active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({ children, className, selected, onClick, ...props }) {
  return (
    <tr
      className={cn(
        'group transition-colors duration-150',
        onClick && 'cursor-pointer',
        selected ? 'bg-brand-50/70 dark:bg-brand-950/40' : 'hover:bg-muted/60',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className, align = 'left', colSpan }) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-border px-3 py-2.5 align-middle text-foreground first:pl-4 last:pr-4',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}

/** Row-level checkbox with a hit area that clears the 24px minimum. */
export function RowCheckbox({ checked, onChange, label, indeterminate = false }) {
  return (
    <label className="-m-2 flex size-9 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors duration-150 hover:bg-muted">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="size-4 cursor-pointer accent-brand-700"
      />
    </label>
  );
}

/** Two-line cell: a strong primary value with a muted qualifier beneath. */
export function Stacked({ primary, secondary, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate font-medium text-foreground">{primary}</div>
      {secondary ? (
        <div className="truncate text-xs text-muted-foreground">{secondary}</div>
      ) : null}
    </div>
  );
}
