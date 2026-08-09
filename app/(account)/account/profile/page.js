import { serialize } from '@/lib/utils';
import DangerZone from '@/components/student/DangerZone';
import PasswordForm from '@/components/student/PasswordForm';
import ProfileForm from '@/components/student/ProfileForm';
import { requireStudentUser } from '../../_lib/session';
import { changePasswordAction, updateProfileAction } from './actions';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const { user } = await requireStudentUser(
    '/dashboard/profile',
    'name email phone university city gender avatar'
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h2 text-foreground">Profile</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Keep your details current so owners can reach you and we can point you at the
          right hostels.
        </p>
      </header>

      <div className="space-y-6">
        {/* Actions are passed down rather than imported by the client component,
            so the form stays free of any server-only module graph. */}
        <ProfileForm user={serialize(user)} action={updateProfileAction} />
        <PasswordForm action={changePasswordAction} />
        <DangerZone email={user.email} />
      </div>
    </div>
  );
}
