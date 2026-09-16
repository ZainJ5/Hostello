import Review from '@/models/Review';
import Hostel from '@/models/Hostel';

/**
 * Hostel.rating / reviewCount are denormalised onto the listing so cards do not
 * need a join, which means any change to a review's visibility has to write
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

const indexState = (globalThis.__hostelloReviewIndex ||= { done: false, running: null });

/**
 * Older databases carry the original full unique index on
 * { hostelId, studentId }, which treats every admin review (studentId null)
 * as the same student. Swap it for the partial index once per process.
 */
export async function ensureReviewIndexes() {
  if (indexState.done) return;
  if (indexState.running) return indexState.running;
  indexState.running = (async () => {
    try {
      const indexes = await Review.collection.indexes().catch(() => []);
      const legacy = indexes.find(
        (ix) =>
          ix.name === 'hostelId_1_studentId_1' && ix.unique && !ix.partialFilterExpression
      );
      if (legacy) await Review.collection.dropIndex(legacy.name);
      await Review.syncIndexes();
      indexState.done = true;
    } catch (err) {
      console.error('[reviews] index sync failed', err?.message || err);
    } finally {
      indexState.running = null;
    }
  })();
  return indexState.running;
}
