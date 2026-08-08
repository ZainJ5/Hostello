'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Row-action menu. The panel is portalled to <body> and positioned from the
 * trigger's rect, because the tables it lives in are scroll containers that
 * would otherwise clip it.
 */
export default function ActionMenu({ items, label = 'Row actions', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const close = (e) => {
      if (
        !panelRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', () => setOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  const visible = items.filter(Boolean);

  const panel =
    open && rect ? (
      <div
        ref={panelRef}
        role="menu"
        style={{
          position: 'fixed',
          top: Math.min(rect.bottom + 6, window.innerHeight - 12),
          left: align === 'right' ? undefined : rect.left,
          right: align === 'right' ? Math.max(window.innerWidth - rect.right, 8) : undefined,
          maxHeight: `calc(100dvh - ${rect.bottom + 20}px)`,
        }}
        className="animate-scale-in z-100 w-52 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface-raised p-1.5 shadow-xl"
      >
        {visible.map((item, i) =>
          item.separator ? (
            <div key={`sep-${i}`} className="my-1 border-t border-border" role="separator" />
          ) : item.href ? (
            <Link
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger-soft dark:hover:bg-danger/15'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
              className={cn(
                'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors duration-150',
                'disabled:pointer-events-none disabled:opacity-45',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger-soft dark:hover:bg-danger/15'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
              {item.label}
            </button>
          )
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          'grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground',
          'transition-colors duration-200 hover:bg-muted hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          open && 'bg-muted text-foreground'
        )}
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
