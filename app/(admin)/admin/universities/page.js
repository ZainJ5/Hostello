import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import UniversitiesManager from '@/components/admin/universities/UniversitiesManager';
import { CITY_OPTIONS, listUniversities } from '@/app/api/admin/_lib/universities';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Universities' };
export const dynamic = 'force-dynamic';

export default async function AdminUniversitiesPage() {
  await requireAdminPage();
  const rows = await listUniversities();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Configure"
        title="Universities"
        description="Every campus students can pick, with its map pin. Listing distances, the map and the university filters all read from this list."
      />
      <UniversitiesManager rows={serialize(rows)} cities={CITY_OPTIONS} />
    </div>
  );
}
