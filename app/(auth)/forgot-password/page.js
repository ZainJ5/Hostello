import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { emailIssue } from '@/components/auth/validation';

export const metadata = {
  title: 'Forgot password',
  description: 'Reset your Hostello password with a 6-digit code sent to your email.',
  robots: { index: false, follow: true },
};

export default async function ForgotPasswordPage({ searchParams }) {
  const sp = await searchParams;
  const raw = typeof sp?.email === 'string' ? sp.email.trim().toLowerCase() : '';
  const initialEmail = emailIssue(raw) ? '' : raw;

  return <ForgotPasswordForm initialEmail={initialEmail} />;
}
