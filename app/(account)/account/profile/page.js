import { serialize } from '@/lib/utils';
import AccountPage from '@/components/student/AccountPage';
import ProfileForm from '@/components/student/ProfileForm';
import { requireStudentUser } from '../../_lib/session';
import { updateProfileAction } from './actions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const { user } = await requireStudentUser(
    '/account/profile',
    'name email phone university city gender avatar'
  );

  return (
    <AccountPage
      title="Your profile"
      lead="Hostel owners see only your name and your number, and only when you send them an enquiry. Your university sets every distance on the site."
      current="Profile"
    >
      {/* The action is passed down rather than imported by the client
          component, so the form stays free of any server-only module graph. */}
      <ProfileForm user={serialize(user)} action={updateProfileAction} />
    </AccountPage>
  );
}
