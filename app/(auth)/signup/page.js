import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SignupForm from '@/components/auth/SignupForm';
import { safeNext, homeForRole } from '@/components/auth/validation';

export const metadata = {
  title: 'Create an account',
  description:
    'Create a free Hostello account to shortlist verified student hostels, message owners and track your bookings.',
  robots: { index: false, follow: true },
};

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams;
  const nextPath = safeNext(sp?.next);

  const session = await getSession();
  if (session) redirect(nextPath || homeForRole(session.role));

  // `?role=owner` lets the "List your hostel" call to action on the public site
  // land on this page with the right card already chosen.
  const initialRole = sp?.role === 'owner' ? 'owner' : 'student';

  return <SignupForm nextPath={nextPath} initialRole={initialRole} />;
}
