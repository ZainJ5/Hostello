import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from '@/components/auth/LoginForm';
import { safeNext, homeForRole } from '@/components/auth/validation';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to Hostello to see your saved hostels and your enquiries.',
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }) {
  // searchParams is async in Next 16.
  const sp = await searchParams;
  const nextPath = safeNext(sp?.next);

  // Already signed in, so send them where they were going rather than showing
  // a form that would just sign them in again.
  const session = await getSession();
  if (session) redirect(nextPath || homeForRole(session.role));

  return <LoginForm nextPath={nextPath} passwordWasReset={sp?.reset === '1'} />;
}
