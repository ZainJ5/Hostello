import Claim from '@/models/Claim';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import ClaimsTable from '@/components/admin/claims/ClaimsTable';
import { CLAIM_STATUSES } from '@/lib/claims';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Claims' };

const PER_PAGE = 15;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Owners asking for listings the import built without them.
 *
 * Sorted pending first and then oldest first inside that, because every
 * pending row is somebody waiting on an answer before students can reach them.
 * The `rank` trick is the reviews queue's: a status string does not sort into
 * a useful order on its own.
 */
export default async function AdminClaimsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);

  const match = {};
  if (sp.status && CLAIM_STATUSES.includes(String(sp.status))) match.status = String(sp.status);
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    match.$or = [
      { hostelName: rx },
      { claimantName: rx },
      { claimantEmail: rx },
      { phone: rx },
    ];
  }

  const [result] = await Claim.aggregate([
    { $match: match },
    { $addFields: { rank: { $indexOfArray: [['pending', 'approved', 'rejected'], '$status'] } } },
    { $sort: { rank: 1, createdAt: 1 } },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * PER_PAGE },
          { $limit: PER_PAGE },
          {
            $lookup: {
              from: 'hostels',
              localField: 'hostelId',
              foreignField: '_id',
              as: 'hostel',
              pipeline: [{ $project: { name: 1, slug: 1, city: 1, area: 1, ownerId: 1 } }],
            },
          },
          { $unwind: { path: '$hostel', preserveNullAndEmptyArrays: true } },
        ],
        count: [{ $count: 'n' }],
      },
    },
  ]);

  const rows = result?.rows || [];
  const total = result?.count?.[0]?.n || 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const statusCounts = await Claim.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Marketplace"
        title="Claims"
        description="Owners asking for a listing that was built from their public listing rather than by them. Approving hands the listing over and puts their number on it, so read what they sent before you do."
      />

      <ClaimsTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        stats={Object.fromEntries(statusCounts.map((r) => [r._id, r.n]))}
      />
    </div>
  );
}
