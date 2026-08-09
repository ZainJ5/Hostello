import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, created, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import AskThread from '@/models/AskThread';
import { askCreateSchema } from '../_lib/schema';
import { makeThreadSlug, questionKey, shapeThread } from '../_lib/shape';

/**
 * POST /api/community/threads: ask a question about a listing.
 *
 * Asking does not require living there. That is the whole point: you ask
 * because you are thinking about moving in. Answering is the side that
 * requires residency, and that gate lives on the answers route.
 *
 * The unique index on `{ hostelId, questionKey }` means the second person to
 * ask the same thing is sent to the existing thread instead of starting a
 * parallel one. The page promises exactly that in its own opening paragraph,
 * so it has to be true in the database rather than in the copy.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student');

  enforceRateLimit(`community:ask:${session.userId}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });

  const body = askCreateSchema.parse(await readJson(req));

  const hostel = await Hostel.findOne({ slug: body.hostelSlug })
    .select('_id name slug status')
    .lean();

  if (!hostel || hostel.status !== 'published') {
    return fail('This hostel is no longer listed', 404);
  }

  const key = questionKey(body.question);
  if (!key) return fail('Write the question out in full', 422);

  const existing = await AskThread.findOne({ hostelId: hostel._id, questionKey: key })
    .select('threadSlug hostelSlug')
    .lean();

  if (existing) {
    return fail('Somebody has already asked that. Nudge the existing question instead', 409, {
      href: `/hostels/${existing.hostelSlug}/ask/${existing.threadSlug}`,
    });
  }

  const user = await User.findById(session.userId).select('name').lean();

  let thread;
  try {
    thread = await AskThread.create({
      hostelId: hostel._id,
      hostelSlug: hostel.slug,
      hostelName: hostel.name,
      question: body.question,
      questionKey: key,
      threadSlug: makeThreadSlug(body.question),
      topic: body.topic,
      askedBy: session.userId,
      askedByName: user?.name || '',
      status: 'open',
    });
  } catch (err) {
    // Lost the race with another tab or another student. The index caught it.
    if (err?.code === 11000) {
      const other = await AskThread.findOne({ hostelId: hostel._id, questionKey: key })
        .select('threadSlug hostelSlug')
        .lean();
      return fail('Somebody has already asked that', 409, {
        href: other ? `/hostels/${other.hostelSlug}/ask/${other.threadSlug}` : undefined,
      });
    }
    throw err;
  }

  return created({ thread: shapeThread(thread.toObject()) });
});
