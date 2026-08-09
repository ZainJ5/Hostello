import mongoose from 'mongoose';

import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import RoommateIntro from '@/models/RoommateIntro';
import RoommateProfile from '@/models/RoommateProfile';
import User from '@/models/User';
import {
  AXES,
  FLEX,
  LEVEL_CLASH,
  LEVEL_CLOSE,
  LEVEL_MATCH,
} from '@/components/roommates/questions';

/**
 * Server side data access for roommate matching. Every read of a roommate
 * profile in the product goes through this file, which is the point: there is
 * one place to look to check that the six answers never escape.
 *
 * THE RULE, stated once so it does not have to be rediscovered:
 *
 *   A student's six compatibility answers are readable by that student and by
 *   nobody else. Not by another student, not by a component that promises not
 *   to render them, not by an API response that "only" carries them for the
 *   client to filter.
 *
 * Three layers hold that up and all three are load bearing:
 *
 *   1. `answers` carries `select: false` in the schema, so no find or findOne
 *      anywhere in the codebase returns it by accident.
 *
 *   2. `loadOwnProfile` and `loadOwnProfileDoc` below are the ONLY two places
 *      in the codebase that say `.select('+answers')`, they sit next to each
 *      other so a reviewer sees both at once, and they are only ever called
 *      with the signed in student's own id.
 *
 *   3. Matching is an aggregation. `select: false` does not apply to
 *      `aggregate()`, so the pipeline computes the whole comparison inside
 *      Mongo and then explicitly projects `answers` away before a single
 *      candidate document crosses the boundary. What comes back is six small
 *      integers per person saying match, close or clash, and never a value
 *      anybody answered.
 *
 * What is still inferable, stated honestly rather than papered over: knowing
 * your own answer and a per axis verdict narrows what the other student could
 * have picked, and at the ends of a scale a "close" verdict pins it exactly.
 * That is inherent in the design, whose whole surface is a six segment strip
 * of per axis agreement. Bucketing to three levels rather than exposing a raw
 * distance is what keeps the rest of it off the table.
 */

// ─── Own profile ────────────────────────────────────────────────────────

/**
 * The signed in student's own profile, answers included.
 *
 * One of the two `+answers` selections in the codebase. If a third ever
 * appears anywhere, the privacy guarantee above is no longer true, so treat
 * these two as a fixture and route everything else through them.
 */
export async function loadOwnProfile(studentId) {
  await connectDB();
  return RoommateProfile.findOne({ studentId })
    .select('+answers +contact')
    .lean();
}

/**
 * The writable twin of `loadOwnProfile`, for the autosave route. Same rule:
 * the caller's own id, never an id off a request.
 */
export async function loadOwnProfileDoc(studentId) {
  await connectDB();
  return RoommateProfile.findOne({ studentId }).select('+answers');
}

/** "Ayesha Khan" becomes "Ayesha K.". A single word name is left alone. */
export function toDisplayName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'A student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function toInitials(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The first name on its own, for the sentences beside each axis. */
export function firstNameOf(displayName) {
  return String(displayName || '').split(/\s+/)[0] || 'They';
}

/**
 * Fetches the caller's profile, creating it on first visit.
 *
 * Campus and gender are seeded from the account record when it has them, so a
 * student who filled in their university at sign up does not type it twice.
 * They are stored on this document rather than read live, because a roommate
 * profile has to be able to say "match me at FJWU" whatever the account says.
 */
export async function ensureOwnProfile(session) {
  await connectDB();

  const existing = await loadOwnProfile(session.userId);
  if (existing) return existing;

  const user = await User.findById(session.userId)
    .select('name university gender')
    .lean();
  if (!user) return null;

  await RoommateProfile.updateOne(
    { studentId: session.userId },
    {
      $setOnInsert: {
        studentId: new mongoose.Types.ObjectId(String(session.userId)),
        displayName: toDisplayName(user.name),
        initials: toInitials(user.name),
        campus: user.university || '',
        gender: ['Male', 'Female', 'Other'].includes(user.gender) ? user.gender : '',
      },
    },
    { upsert: true }
  );

  return loadOwnProfile(session.userId);
}

/** True once the profile can actually take part in matching. */
export function canMatch(profile) {
  return Boolean(profile?.complete && profile?.campus && profile?.gender);
}

// ─── Matching ───────────────────────────────────────────────────────────

/**
 * One axis of the comparison, as a Mongo expression.
 *
 * `mine` is a literal number, taken from the caller's own document, which the
 * caller is entitled to. `theirs` is a field reference that is read inside the
 * database and never returned. The output is 2, 1 or 0.
 */
function levelExpr(axis, mine) {
  const theirs = `$answers.${axis}`;

  // A flexible answer of my own is close to anything and equal only to another
  // flexible answer.
  if (mine === FLEX) {
    return { $cond: [{ $eq: [theirs, FLEX] }, LEVEL_MATCH, LEVEL_CLOSE] };
  }

  return {
    $switch: {
      branches: [
        { case: { $eq: [theirs, FLEX] }, then: LEVEL_CLOSE },
        { case: { $eq: [theirs, mine] }, then: LEVEL_MATCH },
        {
          case: { $eq: [{ $abs: { $subtract: [theirs, mine] } }, 1] },
          then: LEVEL_CLOSE,
        },
      ],
      default: LEVEL_CLASH,
    },
  };
}

/** The ids nobody should ever be scored against: me, and blocks either way. */
async function excludedIds(me) {
  const mine = String(me.studentId);
  const blockedByThem = await RoommateProfile.find({ blocked: me.studentId })
    .select('studentId')
    .lean();

  const ids = new Set([mine]);
  for (const id of me.blocked || []) ids.add(String(id));
  for (const row of blockedByThem) ids.add(String(row.studentId));

  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

const MATCH_LIMIT = 20;

/**
 * The matching aggregation, as stages.
 *
 * Split out from `findMatches` so it can be read on its own and run on its own
 * by a check that inspects the raw documents, before any shaping in JavaScript
 * has had a chance to tidy a leak away. If the projection is ever weakened,
 * that check fails and the pretty shaping in `publicMatch` cannot hide it.
 *
 * Read the `$project` stage before changing anything here. Everything above it
 * runs inside Mongo; everything below it is already safe. Moving a stage across
 * that line is how this feature would leak.
 */
export function matchPipeline({ me, excluded, onlyProfileId = null }) {
  const levels = Object.fromEntries(
    AXES.map((axis) => [axis, levelExpr(axis, me.answers[axis])])
  );

  const match = {
    campus: me.campus,
    gender: me.gender,
    // The brief's `studentId: { $ne: me.studentId }` widened to cover blocks
    // in both directions. A blocked student is never scored, so a block costs
    // nothing to enforce and cannot be undone by a client.
    studentId: { $nin: excluded },
    complete: true,
    visible: true,
  };

  if (onlyProfileId) {
    match._id = new mongoose.Types.ObjectId(String(onlyProfileId));
  }

  return [
    { $match: match },
    { $addFields: { axes: levels, score: { $add: Object.values(levels) } } },
    // The answers never cross the database boundary for anyone but their
    // owner. `select: false` does not apply to aggregate, so this stage is the
    // guard, not a tidy-up. `contact` goes with them: it is only ever revealed
    // on an accepted intro, and `blocked` is nobody else's business either.
    { $project: { answers: 0, contact: 0, blocked: 0 } },
    { $sort: { score: -1, updatedAt: -1 } },
    { $limit: onlyProfileId ? 1 : MATCH_LIMIT },
  ];
}

export async function findMatches(me, { onlyProfileId = null } = {}) {
  if (!canMatch(me)) return [];
  if (onlyProfileId && !mongoose.isValidObjectId(onlyProfileId)) return [];
  await connectDB();

  const excluded = await excludedIds(me);
  const rows = await RoommateProfile.aggregate(
    matchPipeline({ me, excluded, onlyProfileId })
  );

  return serialize(rows).map(publicMatch);
}

/** A single candidate, by profile id, scored the same way and nothing more. */
export async function findMatch(me, profileId) {
  const rows = await findMatches(me, { onlyProfileId: profileId });
  return rows[0] || null;
}

/**
 * The only shape a match is ever handed to a component in.
 *
 * Built field by field rather than by deleting things from the document, so a
 * field added to the schema later is invisible here until somebody adds it on
 * purpose. Never return a raw Mongoose document from a roommate route.
 */
export function publicMatch(row) {
  const axes = {};
  for (const axis of AXES) {
    axes[axis] = typeof row?.axes?.[axis] === 'number' ? row.axes[axis] : LEVEL_CLASH;
  }
  return {
    id: String(row._id),
    studentId: String(row.studentId),
    displayName: row.displayName || 'A student',
    initials: row.initials || '?',
    campus: row.campus || '',
    year: row.year || '',
    programme: row.programme || '',
    note: row.note || '',
    looking: row.looking || '',
    axes,
    score: Number(row.score) || 0,
  };
}

/**
 * Both directions of the caller's introductions, shaped for the screen.
 *
 * The two directions are shaped differently on purpose. A received request
 * carries the sender's name, year, programme and message, because the caller
 * has to decide about it. A sent one carries the recipient's name and whether
 * they accepted, and nothing else: not whether it was read, not whether it was
 * ignored, not whether it was blocked. Those three look identical from the
 * sending side, which is what makes ignoring somebody safe to do.
 */
export async function loadIntros(studentId) {
  await connectDB();

  const [received, sent] = await Promise.all([
    RoommateIntro.find({ toStudentId: studentId, status: { $ne: 'blocked' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    RoommateIntro.find({ fromStudentId: studentId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const names = new Map();
  if (sent.length) {
    const rows = await RoommateProfile.find({
      studentId: { $in: sent.map((r) => r.toStudentId) },
    })
      .select('studentId displayName')
      .lean();
    for (const row of rows) names.set(String(row.studentId), row.displayName);
  }

  return {
    received: received.map((row) => ({
      id: String(row._id),
      displayName: row.fromDisplayName || 'A student',
      initials: row.fromInitials || '?',
      year: row.fromYear || '',
      programme: row.fromProgramme || '',
      message: row.message || '',
      status: row.status,
      isNew: !row.readAt,
    })),
    sent: sent.map((row) => ({
      id: String(row._id),
      displayName: names.get(String(row.toStudentId)) || 'A student',
      message: row.message || '',
      accepted: row.status === 'accepted',
    })),
  };
}

/**
 * How an intro between two students stands, from the caller's side.
 *
 * `sent` says only whether the caller has already written, and `accepted` only
 * whether it was accepted. An ignored request and a blocked one both come back
 * as sent and not accepted, which is the same shape as one nobody has opened
 * yet. Ignoring somebody has to tell them nothing, or it is not a refusal a
 * student can make safely.
 */
export async function introState({ viewerStudentId, otherStudentId }) {
  await connectDB();
  const [mine, theirs] = await Promise.all([
    RoommateIntro.findOne({ fromStudentId: viewerStudentId, toStudentId: otherStudentId })
      .select('status createdAt decidedAt')
      .lean(),
    RoommateIntro.findOne({ fromStudentId: otherStudentId, toStudentId: viewerStudentId })
      .select('status createdAt decidedAt message')
      .lean(),
  ]);

  const accepted = mine?.status === 'accepted' || theirs?.status === 'accepted';

  return {
    sent: Boolean(mine),
    sentAt: mine?.createdAt || null,
    accepted,
    acceptedAt: accepted ? mine?.decidedAt || theirs?.decidedAt || null : null,
    // A request pointing the other way is the caller's to answer, so it is
    // theirs to see in full.
    incoming: theirs && theirs.status === 'sent' ? { message: theirs.message || '' } : null,
  };
}

/**
 * The contact line, revealed to a counterpart only once an intro between the
 * two of them has been accepted. Kept here rather than in a route so the
 * accepted check and the read of a `select: false` field sit together.
 */
export async function revealContact({ viewerStudentId, ownerStudentId, accepted }) {
  if (!accepted) return '';
  if (String(viewerStudentId) === String(ownerStudentId)) return '';
  await connectDB();
  const row = await RoommateProfile.findOne({ studentId: ownerStudentId })
    .select('+contact')
    .lean();
  return row?.contact || '';
}

/** How many other students could even be considered, for the empty states. */
export async function countCandidates(me) {
  if (!me?.campus || !me?.gender) return 0;
  await connectDB();
  return RoommateProfile.countDocuments({
    campus: me.campus,
    gender: me.gender,
    studentId: { $ne: me.studentId },
    complete: true,
    visible: true,
  });
}
