import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import AccountPage from '@/components/student/AccountPage';
import SavedGrid from '@/components/student/SavedGrid';
import { requireStudentUser } from '../../_lib/session';
import { SAVED_ROW_FIELDS, toSavedRow } from '../../_lib/rows';

export const metadata = { title: 'Saved hostels' };

export default async function SavedPage() {
  const { user } = await requireStudentUser('/account/saved', 'savedHostels university');
  await connectDB();

  const ids = (user.savedHostels || []).map(String);

  // Only published listings: a suspended one would render as a dead row the
  // student can't act on.
  const rows = ids.length
    ? await Hostel.find({ _id: { $in: ids }, status: 'published' })
        .select(SAVED_ROW_FIELDS)
        .lean()
    : [];

  // `savedHostels` is append-ordered, so reversing gives most-recent-first
  // without storing a timestamp per save.
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id)));

  return (
    <AccountPage
      title="Saved hostels"
      lead="Kept in the order you saved them. Saving tells the owner nothing and holds no room."
      current="Saved hostels"
    >
      <div className="flex flex-col gap-4">
        <SavedGrid hostels={rows.map((row) => toSavedRow(row, user.university))} />
        {rows.length ? (
          <p className="ds-body-s text-ds-ink-muted">
            Distances are a straight line to your campus, so the walk is always longer.
            Set your university on the profile page if the distance is missing.
          </p>
        ) : null}
      </div>
    </AccountPage>
  );
}
