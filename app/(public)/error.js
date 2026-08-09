'use client';

import ErrorState from '@/components/ds/ErrorState';

/**
 * Group level boundary for the public site. It catches a render failure in a
 * listing, a search or a landing page, which is most often the database being
 * briefly unreachable, so retrying is the right first move.
 *
 * The site chrome sits in the layout above this, so the header and footer stay
 * on screen and the visitor keeps a way out.
 */
export default function PublicError({ error, reset }) {
  return (
    <ErrorState
      title="This page did not load"
      body="Something failed at our end while putting this page together. It is not something you did. Trying again usually works, and the listings are all still there."
      digest={error?.digest}
      reset={reset}
      homeHref="/hostels"
      homeLabel="Browse hostels"
    />
  );
}
