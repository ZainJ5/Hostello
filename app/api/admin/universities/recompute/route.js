import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { recomputeAllDistances } from '@/app/api/admin/_lib/universities';

/** Recalculates the nearest-campus distance stored on every listing. */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');
  const result = await recomputeAllDistances();
  await writeAudit(req, session, {
    action: 'university.recompute',
    targetType: 'Hostel',
    meta: result,
  });
  return ok(result);
});
