import { getOwnerContext, getActionSummary, getOwnerProfile } from './_lib/owner-data';
import OwnerShell from '@/components/owner/OwnerShell';
import { serialize } from '@/lib/utils';

export const metadata = {
  title: { default: 'Owner console', template: '%s · Owner console · Hostello' },
  robots: { index: false, follow: false },
};

/**
 * `proxy.js` already gates `/owner`, but the guard is repeated here on purpose:
 * a proxy misconfiguration must not turn into an unauthenticated data read.
 * Every page and route handler underneath calls it again for the same reason.
 */
export default async function OwnerLayout({ children }) {
  const { session, ownerId } = await getOwnerContext();
  const [profile, summary] = await Promise.all([
    getOwnerProfile(ownerId),
    getActionSummary(ownerId),
  ]);

  const user = {
    name: profile?.name || session.name || 'Owner',
    email: profile?.email || session.email || '',
    avatar: profile?.avatar || '',
    // Owners who never filled in a business name still need a heading that
    // reads as theirs rather than an empty slot.
    businessName: profile?.businessName || `${profile?.name || session.name || 'My'} Hostels`,
  };

  return (
    <OwnerShell user={user} summary={serialize(summary)}>
      {children}
    </OwnerShell>
  );
}
