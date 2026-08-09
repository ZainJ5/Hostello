import mongoose from 'mongoose';

/**
 * The notice board.
 *
 * Five fixed post types and no free text composer. A student picks a type and
 * fills that type's fields; there is never a blank box. The headline and the
 * detail line a reader sees are composed from those fields at render time by
 * `components/community/notice-types.js`, so a post cannot become arbitrary
 * prose and the wording can be corrected later without a migration.
 *
 * The five types are the five things a resident of a Pakistani student hostel
 * actually needs to tell the other residents, and each one is naturally time
 * bound, which is what makes an expiring board work:
 *
 *   ride     sharing a rickshaw or a car to campus. Dead the moment it leaves.
 *   room     a bed coming free. Dead on the date it comes free.
 *   selling  a kettle, a lamp, a mattress at the end of term. Dead in a
 *            fortnight, because unsold means nobody wanted it.
 *   mess     the mess is off, the timing moved, the menu changed. Dead at
 *            midnight, because tomorrow it is wrong.
 *   lost     lost or found. Dead in a week, because an unclaimed item stops
 *            being news.
 *
 * Rejected: a general "announcement" type, which is a free text composer
 * wearing a hat and would swallow the other four; a maintenance or repair
 * type, because that is a message to the owner and the owner console is frozen;
 * a "looking for a roommate" type, because roommate matching is its own
 * feature and duplicating it here would split the same intent across two
 * surfaces.
 */

export const NOTICE_TYPES = ['ride', 'room', 'selling', 'mess', 'lost'];

/** Flags needed before a post drops out of public view, as reviews use. */
export const AUTO_FLAG_THRESHOLD = 3;

/**
 * Every field any type can carry, declared so Mongoose casts dates and numbers
 * properly. A single Mixed blob would store "2026-10-01" as a string and the
 * expiry maths would silently work on text. Which subset is required is
 * enforced per type by the zod schema on the write route.
 */
const detailsSchema = new mongoose.Schema(
  {
    // ride
    destination: { type: String, default: '', maxlength: 60 },
    pickup: { type: String, default: '', maxlength: 60 },
    leavingAt: { type: Date, default: null },
    seats: { type: Number, default: null, min: 1, max: 6 },
    costEach: { type: Number, default: null, min: 0 },

    // room
    roomLabel: { type: String, default: '', maxlength: 24 },
    freeFrom: { type: Date, default: null },
    rent: { type: Number, default: null, min: 0 },
    depositTransfers: { type: Boolean, default: false },

    // selling and lost both name an item
    item: { type: String, default: '', maxlength: 60 },

    // selling
    price: { type: Number, default: null, min: 0 },
    condition: { type: String, default: '', maxlength: 24 },

    // mess
    meals: { type: [String], default: [] },
    onDate: { type: Date, default: null },
    reason: { type: String, default: '', maxlength: 32 },
    note: { type: String, default: '', maxlength: 120 },

    // lost
    direction: { type: String, default: '', maxlength: 8 },
    place: { type: String, default: '', maxlength: 60 },
  },
  { _id: false }
);

const noticePostSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    hostelSlug: { type: String, required: true, index: true },

    type: { type: String, enum: NOTICE_TYPES, required: true, index: true },
    details: { type: detailsSchema, default: () => ({}) },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: { type: String, default: '' },
    // "Sana, Room 2A". Optional, because a student does not have to say which
    // room they are in to put a ride on the board.
    authorRoom: { type: String, default: '', maxlength: 24 },

    /**
     * When this post stops being true. Set by the server from the type's own
     * rule, never by the client, so a student cannot pin a post to the board
     * for a year.
     */
    expiresAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ['published', 'flagged', 'removed'],
      default: 'published',
      index: true,
    },
    flagCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

/**
 * THE BOARD EMPTIES ITSELF.
 *
 * A TTL index, not a cron. `expireAfterSeconds: 0` tells Mongo to delete the
 * document as soon as the date in `expiresAt` is in the past, so expiry is a
 * property of the data rather than a job somebody has to remember to run, keep
 * alive and monitor. Nothing outside Mongo has to be correct for the board to
 * clear.
 *
 * Two things follow from that and both are handled:
 *
 *   1. The TTL monitor sweeps roughly once a minute, so a post can survive up
 *      to about sixty seconds past its expiry. Every read therefore also
 *      filters on `expiresAt: { $gt: now }`, so the board is exact even though
 *      the deletion is not instant.
 *   2. TTL indexes must be single field, so this cannot be merged into the
 *      compound board index below.
 */
noticePostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// The board itself: one hostel, live posts, newest first.
noticePostSchema.index({ hostelId: 1, status: 1, createdAt: -1 });

export default mongoose.models.NoticePost ||
  mongoose.model('NoticePost', noticePostSchema);
