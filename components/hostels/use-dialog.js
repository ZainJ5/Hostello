'use client';

import { useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal behaviour for the filter sheet and the photo lightbox:
 * body-scroll lock, Escape to dismiss, a Tab cycle that can't escape the
 * panel, and focus restored to whatever opened it.
 *
 * `onKey` receives any key the hook doesn't handle itself, which is how the
 * lightbox adds arrow-key navigation without duplicating the trap.
 */
export function useDialog(open, { ref, onClose, onKey } = {}) {
  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;

    // Compensate for the scrollbar so locking doesn't shift the page.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    const panel = ref?.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus?.({ preventScroll: true });

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
          (el) => el.offsetParent !== null || el === document.activeElement
        );
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
        return;
      }
      onKey?.(e);
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      if (opener instanceof HTMLElement) opener.focus?.({ preventScroll: true });
    };
  }, [open, ref, onClose, onKey]);
}

export default useDialog;
