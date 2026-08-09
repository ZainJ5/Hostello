import { connectDB } from '@/lib/db';
import { clientIp, fail, handler, ok, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { recordEngagement } from '../../_track';

/**
 * POST /api/hostels/:slug/view
 *
 * Increments `Hostel.views` and appends a `PageView { kind: 'view' }`.
 * Called once per visitor per browser session by `<ViewTracker>`, which holds
 * the dedupe key in `sessionStorage`. The server-side rate limit below is a
 * flood guard, not the deduplication mechanism.
 *
 * Body (optional): `{ referrer?: string }`
 * Response: `{ ok: true, views: number }`, or 404 for an unpublished slug.
 */
export const POST = handler(async (req, ctx) => {
  const { slug } = await ctx.params;

  enforceRateLimit(`hostel:view:${clientIp(req)}`, { max: 90, windowMs: 60_000 });

  await connectDB();
  const body = await readJson(req);

  const hostel = await recordEngagement({
    req,
    slug,
    counter: 'views',
    kind: 'view',
    referrer: body?.referrer,
  });

  if (!hostel) return fail('Hostel not found', 404);

  return ok({ ok: true, views: hostel.views });
});
