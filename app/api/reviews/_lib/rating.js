import mongoose from 'mongoose';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';

/**
 * The **only** place `Hostel.rating` and `Hostel.reviewCount` are ever written.
 *
 * Those two fields are denormalised onto the listing so a card render doesn't
 * need a join, which means they can drift from the rows they summarise the
 * moment one code path forgets to update them. Every review create, edit,
 * delete and status flip in `app/api/reviews/**` calls this instead of doing
 * its own arithmetic, so the aggregate is always recomputed from scratch
 * rather than nudged by a delta. An incremental `$inc` would compound any
 * error forever, whereas a full recompute self-heals.
 *
 * Only `published` reviews count. A review that has been auto-flagged or
 * removed by an admin is hidden on the public detail page, so leaving it in
 * the average would advertise a score nobody can see the evidence for.
 */
export async function recomputeHostelRating(hostelId) {
  if (!hostelId) return { rating: 0, reviewCount: 0 };

  const _id = new mongoose.Types.ObjectId(String(hostelId));

  const [agg] = await Review.aggregate([
    { $match: { hostelId: _id, status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  // One decimal place, matching how `Rating` renders it, so the stored value
  // and the displayed value are never a rounding apart.
  const rating = agg ? Math.round(agg.avg * 10) / 10 : 0;
  const reviewCount = agg ? agg.count : 0;

  await Hostel.updateOne({ _id }, { $set: { rating, reviewCount } });

  return { rating, reviewCount };
}
