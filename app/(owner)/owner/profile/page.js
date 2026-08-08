import { serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import ProfileForm from '@/components/owner/ProfileForm';
import { getOwnerContext, getOwnerProfile } from '../../_lib/owner-data';

export const metadata = { title: 'Profile' };

export default async function OwnerProfilePage() {
  // No id in the URL: the profile shown is always the one this session owns.
  const { ownerId } = await getOwnerContext();
  const profile = serialize(await getOwnerProfile(ownerId));

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your business details and account security."
      />
      <ProfileForm profile={profile || { name: '', email: '' }} />
    </>
  );
}
