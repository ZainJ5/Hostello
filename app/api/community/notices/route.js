import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, created, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import NoticePost from '@/models/NoticePost';
import { expiryFor, noticeTypeDef } from '@/components/community/notice-types';
import { noticeEnvelopeSchema, parseNoticeDetails } from '../_lib/schema';
import { shapeNotice } from '../_lib/shape';
import { livesAt } from '@/components/community/residency';

const DAY = 24 * 60 * 60 * 1000;

/** The furthest ahead any post is allowed to reach, whatever its type says. */
const MAX_LIFETIME_DAYS = 200;

/**
 * POST /api/community/notices: put something on a hostel's board.
 *
 * Three things this route insists on, in order:
 *
 *   1. You live here. The board is private to residents, so the same rule that
 *      gates answering gates posting and reading.
 *   2. The post is one of five types and carries that type's fields. There is
 *      no shape a client can send that produces a free text post, because the
 *      only thing stored is the fields the type declares and everything a
 *      reader sees is composed from them.
 *   3. THE SERVER SETS THE EXPIRY. It is never read from the request. A client
 *      that could choose its own expiry could pin a post to the board forever,
 *      and the board's whole promise is that it empties itself.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student');

  enforceRateLimit(`community:notice:${session.userId}`, {
    max: 10,
    windowMs: 24 * 60 * 60 * 1000,
  });

  const envelope = noticeEnvelopeSchema.parse(await readJson(req));
  const def = noticeTypeDef(envelope.type);
  if (!def) return fail('That is not a post type', 400);

  const details = parseNoticeDetails(envelope.type, envelope.details);

  const hostel = await Hostel.findOne({ slug: envelope.hostelSlug })
    .select('_id slug status')
    .lean();
  if (!hostel || hostel.status !== 'published') {
    return fail('This hostel is no longer listed', 404);
  }

  const resident = await livesAt(session.userId, hostel._id);
  if (!resident) {
    return fail('Only residents can post on this board', 403);
  }

  const now = Date.now();

  // A date the type asked for must be ahead of us and not absurdly far ahead.
  // Checked before the expiry is derived, so the message can name the field a
  // student actually filled in rather than a value they never saw.
  if (def.maxAheadDays) {
    const dated = ['leavingAt', 'freeFrom', 'onDate']
      .map((k) => details[k])
      .find(Boolean);
    if (dated) {
      const at = new Date(dated).getTime();
      if (at > now + def.maxAheadDays * DAY) {
        return fail(`That is more than ${def.maxAheadDays} days away`, 422);
      }
    }
  }

  const expiresAt = expiryFor(envelope.type, details);
  if (!expiresAt) return fail('That post has no expiry, which cannot happen', 422);
  if (expiresAt.getTime() <= now) {
    return fail('That has already happened, so the board would drop it straight away', 422);
  }
  if (expiresAt.getTime() > now + MAX_LIFETIME_DAYS * DAY) {
    return fail('Nothing stays on the board that long', 422);
  }

  const user = await User.findById(session.userId).select('name').lean();

  const post = await NoticePost.create({
    hostelId: hostel._id,
    hostelSlug: hostel.slug,
    type: envelope.type,
    details,
    authorId: session.userId,
    authorName: user?.name || '',
    authorRoom: envelope.room,
    expiresAt,
    status: 'published',
  });

  return created({ notice: shapeNotice(post.toObject()) });
});
