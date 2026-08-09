import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import SavedGrid from '@/components/student/SavedGrid';
import { HOSTEL_CARD_FIELDS } from '@/components/student/constants';
import { requireStudentUser } from '../../_lib/session';

export const metadata = { title: 'Saved hostels' };

export default async function SavedPage() {
  const { user } = await requireStudentUser('/dashboard/saved', 'savedHostels');
  await connectDB();

  const ids = (user.savedHostels || []).map(String);

  // Only published listings: a suspended one would render as a dead card the
  // student can't act on.
  const rows = ids.length
    ? await Hostel.find({ _id: { $in: ids }, status: 'published' })
        .select(HOSTEL_CARD_FIELDS)
        .lean()
    : [];

  // `savedHostels` is append-ordered, so reversing gives most-recent-first
  // without storing a timestamp per save.
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id)));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 text-foreground">Saved hostels</h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Your shortlist. Compare them side by side, then send a request when you are
            ready.
          </p>
        </div>
        {rows.length > 0 && (
          <p className="tabular text-sm text-muted-foreground">
            {rows.length} saved
          </p>
        )}
      </header>

      <SavedGrid hostels={serialize(rows)} />
    </div>
  );
}
