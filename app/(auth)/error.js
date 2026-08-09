'use client';

import ErrorState from '@/components/ds/ErrorState';

/**
 * Group level boundary for sign in, sign up, verification and password reset.
 *
 * The wording is deliberately careful about what it claims. A failure here can
 * happen either side of the account being created or the password being
 * changed, and this boundary cannot tell which. Saying "nothing was saved"
 * would be a guess, and a wrong one would send somebody to sign up twice, so
 * it points at sign in instead, where the truth becomes obvious.
 */
export default function AuthError({ error, reset }) {
  return (
    <ErrorState
      title="That step did not go through"
      body="Something failed at our end. If you were creating an account or changing a password, try signing in first: the change may already have gone through."
      digest={error?.digest}
      reset={reset}
      homeHref="/login"
      homeLabel="Go to sign in"
    />
  );
}
