import Hostel from '@/models/Hostel';
import { PAYMENT_METHODS } from '@/models/Payment';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import { getSettings } from '@/app/api/admin/_lib/settings';
import PageHeader from '@/components/admin/PageHeader';
import SettingsForm from '@/components/admin/settings/SettingsForm';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  await requireAdminPage();

  const [settings, featuredInUse] = await Promise.all([
    getSettings(),
    Hostel.countDocuments({ featured: true }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Configure"
        title="Platform settings"
        description="The listing fee, the accounts owners pay into, and how much featured inventory exists."
      />

      <SettingsForm
        settings={serialize(settings)}
        methods={PAYMENT_METHODS}
        featuredInUse={featuredInUse}
      />
    </div>
  );
}
