import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import { getAnalytics } from '@/app/api/admin/_lib/analytics';
import { serialize } from '@/lib/utils';

/**
 * Backs the range picker on /admin/analytics. The page server-renders the
 * 30-day view for first paint; switching range refetches here so the charts
 * keep their mounted state instead of remounting on a full navigation.
 */
export const GET = handler(async (req) => {
  await connectDB();
  await requireRole('admin');

  const range = new URL(req.url).searchParams.get('range');
  const data = await getAnalytics(range);

  return ok(serialize(data));
});
