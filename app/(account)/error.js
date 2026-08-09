'use client';

import ErrorState from '@/components/ds/ErrorState';

/**
 * Group level boundary for the account area.
 *
 * Everything behind it is the student's own saved listings, enquiries and
 * reviews, so the reassurance that matters is that a read failure has not lost
 * any of it. Nothing in this group writes on render.
 */
export default function AccountError({ error, reset }) {
  return (
    <ErrorState
      title="Your account did not load"
      body="Something failed at our end while reading your account. Nothing has been lost: your saved hostels, enquiries and reviews are all still recorded."
      digest={error?.digest}
      reset={reset}
      homeHref="/account/saved"
      homeLabel="Go to saved hostels"
    />
  );
}
