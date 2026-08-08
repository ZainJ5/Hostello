import Payment, { PAYMENT_METHODS } from '@/models/Payment';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import { getSettings } from '@/app/api/admin/_lib/settings';
import PageHeader from '@/components/admin/PageHeader';
import PaymentsQueue from '@/components/admin/payments/PaymentsQueue';
import Badge from '@/components/ui/Badge';
import { formatPKR, serialize } from '@/lib/utils';

export const metadata = { title: 'Payments' };

const PER_PAGE = 15;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminPaymentsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const match = {};
  if (sp.status) match.status = sp.status;
  if (sp.method) match.method = sp.method;

  // Text search spans the payment and the joined hostel/owner, so it runs
  // after the lookups rather than in the initial $match.
  const term = String(sp.q || '').trim();
  const rx = term ? new RegExp(escapeRegex(term), 'i') : null;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'hostels',
        localField: 'hostelId',
        foreignField: '_id',
        as: 'hostel',
        pipeline: [{ $project: { name: 1, slug: 1, city: 1, status: 1 } }],
      },
    },
    { $unwind: { path: '$hostel', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'ownerId',
        foreignField: '_id',
        as: 'owner',
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'reviewedBy',
        foreignField: '_id',
        as: 'reviewer',
        pipeline: [{ $project: { name: 1, email: 1 } }],
      },
    },
    { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
  ];

  if (rx) {
    pipeline.push({
      $match: {
        $or: [
          { transactionRef: rx },
          { 'hostel.name': rx },
          { 'owner.name': rx },
          { 'owner.email': rx },
        ],
      },
    });
  }

  // Pending first — this is a work queue, not a ledger.
  pipeline.push(
    {
      $addFields: {
        rank: { $indexOfArray: [['pending', 'approved', 'rejected'], '$status'] },
      },
    },
    { $sort: { rank: 1, createdAt: -1 } },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * PER_PAGE }, { $limit: PER_PAGE }],
        count: [{ $count: 'n' }],
      },
    }
  );

  const [result] = await Payment.aggregate(pipeline);
  const rows = result?.rows || [];
  const total = result?.count?.[0]?.n || 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const [statusCounts, pendingValue, settings] = await Promise.all([
    Payment.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]),
    getSettings(),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((r) => [r._id, r.n]));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Marketplace"
        title="Payments"
        description="There is no gateway — owners transfer the listing fee and upload a receipt. Approving one publishes its listing and emails the owner."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Listing fee {formatPKR(settings?.listingFee ?? 0)}</Badge>
            {(byStatus.pending || 0) > 0 && (
              <Badge tone="warning" className="tabular">
                {formatPKR(pendingValue?.[0]?.sum || 0)} awaiting review
              </Badge>
            )}
          </div>
        }
      />

      <PaymentsQueue
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        methods={PAYMENT_METHODS}
        stats={{
          pending: byStatus.pending || 0,
          approved: byStatus.approved || 0,
          rejected: byStatus.rejected || 0,
        }}
      />
    </div>
  );
}
