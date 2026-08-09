'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';

/**
 * Sign out.
 *
 * It used to live in an account menu in the old dashboard header. The frames
 * put it in a "Leaving" panel at the foot of settings instead, next to account
 * deletion, which is the only other thing on the site that ends a session.
 *
 * The refresh after the redirect clears the client router cache, so no page
 * rendered under the old session can be restored with the back button.
 */
export default function SignOutButton() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // A network failure still falls through to the redirect below. The route
      // guard bounces them if the cookie somehow survived.
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={signOut} loading={signingOut} className="w-full">
      Sign out
    </Button>
  );
}
