import mongoose from 'mongoose';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import Review from '@/models/Review';
import AskThread from '@/models/AskThread';
import NoticePost from '@/models/NoticePost';
import { shapeNotice, shapeThread } from '@/app/api/community/_lib/shape';
import { answerCoverage } from './topics';
import { publicName } from './identity';

/**
 * Server side reads for the community routes. Pages call these directly rather
 * than fetching their own API, which is what makes a thread server rendered
 * and indexable in the first place.
 *
 * Nothing here returns a Mongoose document. Everything goes out through the
 * shape functions in `app/api/community/_lib/shape.js`, so the page and the
 * API cannot disagree about what is public.
 */

const OID = /^[a-f\d]{24}$/i;

export function isObjectId(value) {
  return OID.test(String(value || ''));
}

export async function publishedHostel(slug) {
  if (!slug) return null;
  return Hostel.findOne({ slug: String(slug), status: 'published' })
    .select('_id name slug city area gender')
    .lean();
}

// ─── Ask residents ──────────────────────────────────────────────────────

/** Threads still worth showing: hidden ones are gone for everybody. */
const VISIBLE = { status: { $in: ['open', 'answered'] } };

/**
 * Everything the ask page needs for one listing, in two queries.
 *
 * Answered and open are separated here rather than in the page, because the
 * page draws them as two different things: an answered question is a document
 * somebody can read, an open one is a request somebody can nudge.
 */
export async function askDataForHostel(hostelId) {
  const [rows, topics] = await Promise.all([
    AskThread.find({ hostelId, ...VISIBLE })
      .sort({ lastAnswerAt: -1, createdAt: -1 })
      .limit(60)
      .lean(),
    // Which of the six topics has at least one published answer. Done as an
    // aggregate so a thread whose only answer has been flagged does not light
    // up its segment.
    AskThread.aggregate([
      { $match: { hostelId: new mongoose.Types.ObjectId(String(hostelId)), ...VISIBLE } },
      { $unwind: '$answers' },
      { $match: { 'answers.status': 'published' } },
      { $group: { _id: '$topic' } },
    ]),
  ]);

  const threads = rows.map((t) => shapeThread(t));

  return {
    answered: threads.filter((t) => t.answerCount > 0),
    open: threads.filter((t) => t.answerCount === 0),
    coverage: answerCoverage(topics.map((t) => t._id)),
  };
}

export async function threadBySlug(hostelSlug, threadSlug) {
  if (!hostelSlug || !threadSlug) return null;
  const row = await AskThread.findOne({
    hostelSlug: String(hostelSlug),
    threadSlug: String(threadSlug),
    ...VISIBLE,
  }).lean();
  return row ? shapeThread(row) : null;
}

/** The cross listing index at /community. */
export async function communityIndexData({ limit = 12 } = {}) {
  const [answered, open, openCount, answeredCount] = await Promise.all([
    AskThread.find({ status: 'answered', answerCount: { $gt: 0 } })
      .sort({ lastAnswerAt: -1 })
      .limit(limit)
      .lean(),
    AskThread.find({ status: 'open' })
      .sort({ nudgeCount: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
    AskThread.countDocuments({ status: 'open' }),
    AskThread.countDocuments({ status: 'answered', answerCount: { $gt: 0 } }),
  ]);

  return {
    answered: answered.map((t) => shapeThread(t, { withAnswers: true })),
    open: open.map((t) => shapeThread(t, { withAnswers: false })),
    openCount,
    answeredCount,
  };
}

// ─── Notice board ───────────────────────────────────────────────────────

/**
 * Live posts for one board.
 *
 * The `expiresAt` filter is not belt and braces. Mongo's TTL monitor sweeps
 * about once a minute, so an expired post can still be sitting in the
 * collection when somebody loads the page. Filtering on read makes the board
 * exact while the index does the deleting.
 */
export async function boardForHostel(hostelId, type = '') {
  const now = new Date();
  const base = { hostelId, status: 'published', expiresAt: { $gt: now } };

  const [rows, byType] = await Promise.all([
    NoticePost.find(type ? { ...base, type } : base)
      .sort({ createdAt: -1 })
      .limit(60)
      .lean(),
    NoticePost.aggregate([
      {
        $match: {
          hostelId: new mongoose.Types.ObjectId(String(hostelId)),
          status: 'published',
          expiresAt: { $gt: now },
        },
      },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = Object.fromEntries(byType.map((r) => [r._id, r.count]));
  const total = byType.reduce((sum, r) => sum + r.count, 0);

  return { notices: rows.map((n) => shapeNotice(n, now)), counts, total };
}

// ─── Cohort and student profiles ────────────────────────────────────────

/**
 * Who appears in a cohort, and on a profile at all.
 *
 * Only students who have already published something in the community under
 * their own name: an answer on a question, or a review. Nobody is listed
 * because they happened to fill in a university on their account.
 *
 * That is a deliberate divergence from the design, which draws a roster with
 * a year, a programme, a budget and the areas somebody is looking in. None of
 * those fields exist on `User`, `models/User.js` is frozen for this work, and
 * there is no consent flag to add one to. Listing every account that names a
 * campus would publish people who never agreed to be published, which is not a
 * trade worth making on a directory that is mostly women's hostels.
 */
async function contributorCounts() {
  const [answerRows, reviewRows] = await Promise.all([
    AskThread.aggregate([
      { $match: VISIBLE },
      { $unwind: '$answers' },
      { $match: { 'answers.status': 'published' } },
      { $group: { _id: '$answers.authorId', count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
    ]),
  ]);

  const map = new Map();
  for (const r of answerRows) {
    map.set(String(r._id), { answers: r.count, reviews: 0 });
  }
  for (const r of reviewRows) {
    const key = String(r._id);
    const cur = map.get(key) || { answers: 0, reviews: 0 };
    cur.reviews = r.count;
    map.set(key, cur);
  }
  return map;
}

/** Campuses that have at least one listing, for the cohort index. */
export async function campusList() {
  const rows = await Hostel.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$universities' },
    { $group: { _id: '$universities', listings: { $sum: 1 } } },
    { $sort: { listings: -1, _id: 1 } },
  ]);
  return rows
    .filter((r) => r._id)
    .map((r) => ({ name: r._id, listings: r.listings }));
}

export async function cohortRoster(campus) {
  const counts = await contributorCounts();
  const ids = [...counts.keys()];
  if (ids.length === 0) return [];

  const users = await User.find({
    _id: { $in: ids },
    role: 'student',
    status: 'active',
    emailVerified: true,
    university: campus,
  })
    .select('name university city createdAt')
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();

  return users.map((u) => {
    const c = counts.get(String(u._id)) || { answers: 0, reviews: 0 };
    return {
      id: String(u._id),
      name: publicName(u.name),
      university: u.university || '',
      city: u.city || '',
      answers: c.answers,
      reviews: c.reviews,
    };
  });
}

/**
 * One student profile: what they have published, and nothing else.
 *
 * `RoommateProfile` is never read here. The six compatibility answers are not
 * on this page, they are not in this query, and no student can reach another
 * student's answers through this route.
 */
export async function studentProfile(id) {
  if (!isObjectId(id)) return null;

  const user = await User.findOne({
    _id: id,
    role: 'student',
    status: 'active',
  })
    .select('name university city emailVerified createdAt')
    .lean();
  if (!user) return null;

  const [threads, reviewCount] = await Promise.all([
    AskThread.find({ 'answers.authorId': id, ...VISIBLE })
      .sort({ lastAnswerAt: -1 })
      .limit(20)
      .lean(),
    Review.countDocuments({ studentId: id, status: 'published' }),
  ]);

  const answers = [];
  for (const t of threads) {
    for (const a of t.answers || []) {
      if (a.status !== 'published' || String(a.authorId) !== String(id)) continue;
      answers.push({
        id: String(a._id),
        body: a.body,
        createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
        question: t.question,
        hostelName: t.hostelName || '',
        href: `/hostels/${t.hostelSlug}/ask/${t.threadSlug}`,
      });
    }
  }

  // Somebody with nothing published has no public profile to show.
  if (answers.length === 0 && reviewCount === 0) return null;

  return {
    id: String(user._id),
    name: publicName(user.name),
    university: user.university || '',
    city: user.city || '',
    emailVerified: Boolean(user.emailVerified),
    answers,
    answerCount: answers.length,
    reviewCount,
  };
}
