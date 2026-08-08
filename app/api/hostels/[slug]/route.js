import { connectDB } from '@/lib/db';
import { fail, handler, ok } from '@/lib/api';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';

/**
 * GET /api/hostels/:slug — one published listing.
 *
 * Response: `{ hostel: { …full document } }`, minus the fields the public has
 * no business reading (`ownerId`, moderation state, engagement counters).
 * 404s for an unknown slug and for any listing that isn't `published`, so
 * draft, rejected and suspended rows are indistinguishable from missing ones.
 */
const PUBLIC_FIELDS = '-__v -ownerId -rejectionReason -contactClicks -saveCount';

export const GET = handler(async (req, ctx) => {
  const { slug } = await ctx.params;
  await connectDB();

  const hostel = await Hostel.findOne({ slug, status: 'published' })
    .select(PUBLIC_FIELDS)
    .lean();

  if (!hostel) return fail('Hostel not found', 404);

  return ok({ hostel: serialize(hostel) });
});
