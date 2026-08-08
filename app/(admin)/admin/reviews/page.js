import mongoose from 'mongoose';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import ReviewsTable from '@/components/admin/reviews/ReviewsTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Reviews' };

const PER_PAGE = 15;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminReviewsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);

  const match = {};
  if (sp.status) match.status = sp.status;
  if (sp.rating) match.rating = Number(sp.rating);
  // An aggregation `$match` does no schema casting, so the id must be a real
  // ObjectId rather than the string that came off the query params.
  if (sp.hostel && mongoose.Types.ObjectId.isValid(sp.hostel)) {
    match.hostelId = new mongoose.Types.ObjectId(String(sp.hostel));
  }
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    match.$or = [{ title: rx }, { comment: rx }, { studentName: rx }];
  }

  const [result] = await Review.aggregate([
    { $match: match },
    // Flagged first — this page is a moderation queue.
    { $addFields: { rank: { $indexOfArray: [['flagged', 'published', 'removed'], '$status'] } } },
    { $sort: { rank: 1, flagCount: -1, createdAt: -1 } },
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
              pipeline: [{ $project: { name: 1, slug: 1, city: 1 } }],
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

  const [statusCounts, hostelIds] = await Promise.all([
    Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Review.distinct('hostelId'),
  ]);

  const hostelOptions = hostelIds.length
    ? (
        await Hostel.find({ _id: { $in: hostelIds } })
          .sort({ name: 1 })
          .select('name')
          .lean()
      ).map((h) => ({ value: String(h._id), label: h.name }))
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Marketplace"
        title="Reviews"
        description="Flagged reviews come first. Removing one recalculates the listing's rating and review count immediately."
      />

      <ReviewsTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        hostels={hostelOptions}
        stats={Object.fromEntries(statusCounts.map((r) => [r._id, r.n]))}
      />
    </div>
  );
}
