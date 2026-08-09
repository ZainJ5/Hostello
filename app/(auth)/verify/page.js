import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import VerifyForm from '@/components/auth/VerifyForm';
import { safeNext, emailIssue, homeForRole } from '@/components/auth/validation';

export const metadata = {
  title: 'Verify your email',
  description: 'Enter the 6-digit code we emailed you to activate your Hostello account.',
  robots: { index: false, follow: false },
};

export default async function VerifyPage({ searchParams }) {
  const sp = await searchParams;

  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  const email = typeof sp?.email === 'string' ? sp.email.trim().toLowerCase() : '';
  // Nothing to verify without an address, so send them back to the start.
  if (emailIssue(email)) redirect('/signup');

  // /api/auth/verify accepts `reset` and `delete-account` too, but those flows
  // finish on their own screens where the code is spent alongside the new
  // password or the deletion. This page only ever confirms a signup.
  if (sp?.purpose === 'reset') {
    redirect(`/reset-password?email=${encodeURIComponent(email)}`);
  }

  return <VerifyForm email={email} nextPath={safeNext(sp?.next)} />;
}
