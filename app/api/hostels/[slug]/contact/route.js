import { connectDB } from '@/lib/db';
import { clientIp, fail, handler, ok, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { recordEngagement } from '../../_track';

/**
 * POST /api/hostels/:slug/contact
 *
 * Increments `Hostel.contactClicks` and appends a `PageView { kind: 'contact' }`
 * — the conversion signal on the owner dashboard. Fired from `<ContactActions>`
 * the moment a student taps Call or WhatsApp.
 *
 * Deliberately *not* deduplicated: unlike a page view, every tap is a genuine
 * intent to contact, and a student who calls twice really did try twice. The
 * rate limit only exists to stop a script inflating an owner's numbers.
 *
 * Body (optional): `{ channel?: 'call' | 'whatsapp', referrer?: string }`
 * Response: `{ ok: true, contactClicks: number }`, or 404 for an unpublished slug.
 */
export const POST = handler(async (req, ctx) => {
  const { slug } = await ctx.params;

  enforceRateLimit(`hostel:contact:${clientIp(req)}`, { max: 30, windowMs: 60_000 });

  await connectDB();
  const body = await readJson(req);

  const hostel = await recordEngagement({
    req,
    slug,
    counter: 'contactClicks',
    kind: 'contact',
    referrer: body?.referrer,
  });

  if (!hostel) return fail('Hostel not found', 404);

  return ok({ ok: true, contactClicks: hostel.contactClicks });
});
