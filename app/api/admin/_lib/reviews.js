import Review from '@/models/Review';
import Hostel from '@/models/Hostel';

/**
 * Hostel.rating / reviewCount are denormalised onto the listing so cards do not
 * need a join — which means any change to a review's visibility has to write
 * them back. Removed reviews drop out of the average; flagged ones stay in
 * until an admin actually removes them.
 */
export async function recomputeHostelRating(hostelId) {
  const [agg] = await Review.aggregate([
    { $match: { hostelId, status: { $ne: 'removed' } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);

  const rating = agg ? Math.round(agg.avg * 10) / 10 : 0;
  const reviewCount = agg?.n || 0;
  await Hostel.updateOne({ _id: hostelId }, { $set: { rating, reviewCount } });
  return { rating, reviewCount };
}
