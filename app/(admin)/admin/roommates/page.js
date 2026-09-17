import mongoose from 'mongoose';
import RoommateProfile from '@/models/RoommateProfile';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import RoommatesTable from '@/components/admin/roommates/RoommatesTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Roommates' };

const PER_PAGE = 20;

/**
 * THE SIX ANSWERS ARE NOT ON THIS PAGE, AND NEITHER IS THE CONTACT LINE.
 *
 * A student's answers are private to them and their contact detail is private
 * until they accept an intro themselves. An admin screen is not an exception
 * to either rule, so this aggregation lists the fields explicitly rather than
 * projecting the document and trimming afterwards: `answers` and `contact`
 * carry `select: false` on the schema, which `aggregate()` ignores, so naming
 * the fields is the only guard that actually holds here.
 *
 * What is left is what the student already shows to another student on their
 * campus: the display name they were given, campus, gender, year, programme
 * and the two lines they wrote, plus the counters the board needs.
 */
const FIELDS = {
  displayName: 1,
  initials: 1,
  campus: 1,
  gender: 1,
  year: 1,
  programme: 1,
  note: 1,
  looking: 1,
  answeredCount: 1,
  complete: 1,
  visible: 1,
  createdAt: 1,
  answersUpdatedAt: 1,
  blockedCount: { $size: { $ifNull: ['$blocked', []] } },
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminRoommatesPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);

  const match = {};
  if (sp.campus) match.campus = String(sp.campus);
  if (sp.gender) match.gender = String(sp.gender);
  if (sp.status === 'complete') match.complete = true;
  if (sp.status === 'started') match.complete = false;
  if (sp.status === 'hidden') match.visible = false;
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    match.$or = [{ displayName: rx }, { programme: rx }, { campus: rx }];
  }

  const [result] = await RoommateProfile.aggregate([
    { $match: match },
    // Finished profiles first: a profile that answered all six is the one that
    // can actually be matched, and an admin is here to see the live ones.
    { $sort: { complete: -1, answeredCount: -1, createdAt: -1 } },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * PER_PAGE },
          { $limit: PER_PAGE },
          {
            // Intro counts, so a profile that is being written to is visible
            // as such. Never the messages themselves.
            $lookup: {
              from: 'roommateintros',
              let: { sid: '$studentId' },
              as: 'introsIn',
              pipeline: [
                { $match: { $expr: { $eq: ['$toStudentId', '$$sid'] } } },
                { $group: { _id: '$status', n: { $sum: 1 } } },
              ],
            },
          },
          {
            $lookup: {
              from: 'roommateintros',
              let: { sid: '$studentId' },
              as: 'introsOut',
              pipeline: [
                { $match: { $expr: { $eq: ['$fromStudentId', '$$sid'] } } },
                { $count: 'n' },
              ],
            },
          },
          // Last, so the lookups above still have `studentId` to join on and
          // nothing outside this list leaves the database.
          { $project: { ...FIELDS, introsIn: 1, introsOut: 1 } },
        ],
        count: [{ $count: 'n' }],
        campuses: [{ $group: { _id: '$campus', n: { $sum: 1 } } }, { $sort: { n: -1 } }],
        totals: [
          {
            $group: {
              _id: null,
              all: { $sum: 1 },
              complete: { $sum: { $cond: ['$complete', 1, 0] } },
              hidden: { $sum: { $cond: ['$visible', 0, 1] } },
            },
          },
        ],
      },
    },
  ]);

  const rows = (result?.rows || []).map((r) => {
    const received = Object.fromEntries((r.introsIn || []).map((x) => [x._id, x.n]));
    return {
      ...r,
      introsIn: undefined,
      introsOut: undefined,
      received: (r.introsIn || []).reduce((a, x) => a + x.n, 0),
      accepted: received.accepted || 0,
      sent: r.introsOut?.[0]?.n || 0,
    };
  });

  const total = result?.count?.[0]?.n || 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const totals = result?.totals?.[0] || { all: 0, complete: 0, hidden: 0 };
  const campuses = (result?.campuses || [])
    .filter((c) => c._id)
    .map((c) => ({ value: c._id, label: `${c._id} (${c.n})` }));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="People"
        title="Roommate profiles"
        description="Everyone who has opened the roommate questions. A profile can be matched once all six are answered. The answers themselves stay private to the student, so they are not shown here."
      />

      <RoommatesTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        campuses={campuses}
        totals={totals}
      />
    </div>
  );
}
