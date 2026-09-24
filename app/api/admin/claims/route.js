import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import { serialize } from '@/lib/utils';
import { CLAIM_STATUSES } from '@/lib/claims';
import Claim from '@/models/Claim';

/**
 * GET /api/admin/claims: the queue, oldest pending first.
 *
 * The page renders server-side like the rest of the console, so this exists
 * for tooling and for anything that needs the counts without a page load.
 */
export const GET = handler(async (req) => {
  await connectDB();
  await requireRole('admin');

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get('limit')) || 25, 100);

  const query = {};
  const status = sp.get('status');
  if (status && CLAIM_STATUSES.includes(status)) query.status = status;

  const [rows, total, counts] = await Promise.all([
    Claim.find(query)
      // Pending first, then the oldest of them, because somebody is waiting.
      .sort({ status: 1, createdAt: 1 })
      .limit(limit)
      .lean(),
    Claim.countDocuments(query),
    Claim.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  return ok({
    total,
    rows: serialize(rows),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
});
