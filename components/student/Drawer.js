'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Overlay panel used for booking details, the review editor and the delete
 * confirmations. Bottom sheet on a phone, side panel from 640px up.
 *
 * Keyboard contract: Escape closes, Tab cycles inside the panel, and focus
 * returns to whatever opened it. Scrolling behind the overlay is locked so the
 * page underneath doesn't drift while a sheet is up.
 */
export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  const panel = useRef(null);
  const opener = useRef(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    opener.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the panel itself rather than the first control, so a screen reader
    // announces the heading before the actions.
    const raf = requestAnimationFrame(() => panel.current?.focus());

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;

      const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, close]);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <div
        aria-hidden="true"
        onClick={close}
        className="animate-fade-in absolute inset-0 bg-ds-ink/60"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          // A sheet is one of the three surfaces the system lets carry a
          // shadow. Cards never do.
          'animate-scale-in relative flex max-h-[92dvh] w-full flex-col rounded-t-ds-control border border-solid border-ds-hairline bg-ds-surface-raised outline-none',
          'sm:h-dvh sm:max-h-none sm:rounded-none sm:rounded-l-ds-control',
          widths[size] || widths.md
        )}
        style={{ boxShadow: 'var(--ds-shadow-menu)' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-solid border-ds-hairline p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="ds-display-s truncate text-ds-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="ds-body-s mt-1 text-pretty text-ds-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="ds-tap -m-1 grid shrink-0 cursor-pointer place-items-center rounded-ds-inner text-ds-ink-muted transition-colors duration-150 hover:text-ds-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt motion-reduce:transition-none"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

        {footer ? (
          <div className="border-t border-solid border-ds-hairline bg-ds-surface-sunken p-4 sm:p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
