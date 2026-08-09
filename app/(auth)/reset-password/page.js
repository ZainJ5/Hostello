import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { emailIssue } from '@/components/auth/validation';

export const metadata = {
  title: 'Reset password',
  description: 'Enter your reset code and choose a new Hostello password.',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }) {
  const sp = await searchParams;
  const email = typeof sp?.email === 'string' ? sp.email.trim().toLowerCase() : '';

  // The code is tied to an address, so without one there is nothing to reset.
  if (emailIssue(email)) redirect('/forgot-password');

  return <ResetPasswordForm email={email} />;
}
