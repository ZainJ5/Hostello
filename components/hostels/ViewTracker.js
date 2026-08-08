'use client';

import { useEffect, useRef } from 'react';

/**
 * Records one listing view per visitor per browser session.
 *
 * `sessionStorage` is the dedupe key rather than a cookie or a server-side
 * fingerprint: it survives refreshes and back-navigation within the tab (the
 * two ways a counter normally gets inflated) but resets when the session ends,
 * which is the granularity the owner dashboard charts assume.
 *
 * Rendered null — it exists purely for the effect.
 */
export default function ViewTracker({ slug }) {
  const fired = useRef(false);

  useEffect(() => {
    // React StrictMode mounts effects twice in development; the ref keeps that
    // from double-counting before sessionStorage has been written.
    if (fired.current || !slug) return;
    fired.current = true;

    const key = `hostello:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Private mode or blocked storage — fall through and count the view.
    }

    // Deliberately not abortable: StrictMode's immediate unmount in
    // development would cancel the only request we ever send, and `keepalive`
    // already lets it finish if the student navigates away mid-flight.
    fetch(`/api/hostels/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: document.referrer || '' }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never surface an error to a browsing student.
    });
  }, [slug]);

  return null;
}
