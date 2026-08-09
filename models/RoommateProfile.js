import mongoose from 'mongoose';
import { AXES, FLEX } from '@/components/roommates/questions';

/**
 * A student's roommate profile.
 *
 * Two halves that are treated very differently:
 *
 *   1. The public half. Display name, campus, gender, year, programme, a short
 *      note they wrote and one line about what they are looking for. All of it
 *      is meant to be read by another student on the same campus.
 *
 *   2. `answers`, the six compatibility answers. These are never readable by
 *      another student, ever. They carry `select: false` so no ordinary find
 *      or findOne returns them, and the only place in the codebase that adds
 *      `.select('+answers')` is the loader for the signed in student's own
 *      profile in components/roommates/query.js.
 *
 * `select: false` is a Mongoose level guard and it does NOT apply to
 * `aggregate()`, which talks to the driver directly. That is exactly why the
 * matching pipeline carries its own explicit `$project` that drops `answers`
 * before any candidate document leaves the database. Both guards are needed;
 * neither one on its own is enough.
 *
 * Campus and gender are stored here rather than added to `User`. The account
 * model already carries `university` and `gender`, and this feature seeds from
 * them, but a roommate profile has to be able to say "match me at FJWU" even
 * when the account says something else, and `User` is out of scope for this
 * work.
 */

/**
 * Every answer is a small integer on that question's own line, low to high, so
 * the pipeline can compare two people with one subtraction. The vocabulary and
 * the FLEX sentinel live in components/roommates/questions.js, which is pure
 * data with no mongoose in it, so the client bundle can read the same list the
 * schema validates against.
 */
const ANSWER_VALUES = [0, 1, 2, 3, FLEX];

const answerField = {
  type: Number,
  enum: ANSWER_VALUES,
  default: null,
};

const answersSchema = new mongoose.Schema(
  {
    sleep: answerField,
    clean: answerField,
    study: answerField,
    guests: answerField,
    smoke: answerField,
    noise: answerField,
  },
  { _id: false }
);

export const YEARS = [
  'First year',
  'Second year',
  'Third year',
  'Fourth year',
  'Fifth year',
  'Masters',
  'PhD',
];

export const GENDERS = ['Male', 'Female', 'Other'];

const roommateProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    /**
     * First name plus a surname initial, for example "Ayesha K.". The surname
     * itself is never stored here and never rendered: it stays on the account
     * record until both students accept an intro.
     */
    displayName: { type: String, default: '', trim: true, maxlength: 60 },
    initials: { type: String, default: '', trim: true, maxlength: 4 },

    // Both are part of the match stage, so a cross campus or cross gender
    // candidate is never scored at all.
    campus: { type: String, default: '', trim: true, index: true },
    gender: { type: String, enum: [...GENDERS, ''], default: '', index: true },

    year: { type: String, enum: [...YEARS, ''], default: '' },
    programme: { type: String, default: '', trim: true, maxlength: 60 },

    /** What the student wrote about themselves. Shown on their match page. */
    note: { type: String, default: '', trim: true, maxlength: 240 },
    /** One line of what they are after. Shown as the footer of a match card. */
    looking: { type: String, default: '', trim: true, maxlength: 90 },

    /**
     * Whatever the student chooses to be reached on once an intro is accepted.
     * Free text, because a phone number, an email or a handle are all valid
     * answers and the product does not care which. Never returned to anybody
     * but the owner and a counterpart on an accepted intro.
     */
    contact: { type: String, default: '', trim: true, maxlength: 80, select: false },

    // The six answers. See the header comment. Nothing else in this file
    // matters as much as this one line.
    answers: { type: answersSchema, default: () => ({}), select: false },

    /**
     * Derived from `answers` on every save so a page can draw answer coverage,
     * and the pipeline can filter on completeness, without ever selecting the
     * answers themselves.
     */
    answeredCount: { type: Number, default: 0, min: 0, max: 6 },
    complete: { type: Boolean, default: false, index: true },
    answersUpdatedAt: { type: Date, default: null },

    /** Off means "stop suggesting me", without deleting anything. */
    visible: { type: Boolean, default: true, index: true },

    /**
     * Students this one has blocked. Matching excludes the block in both
     * directions, so a block is silent and symmetric even though only one
     * side chose it.
     */
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// The only shape the matching pipeline ever filters on.
roommateProfileSchema.index({ campus: 1, gender: 1, complete: 1, visible: 1 });

/**
 * Keeps the derived counters honest. Guarded on `isModified` so a save that
 * never selected `answers` cannot zero the count it could not read.
 *
 * Synchronous, with no `next`. Mongoose 9 calls a hook of this shape without a
 * callback argument, so declaring one and calling it throws.
 */
roommateProfileSchema.pre('save', function recount() {
  if (!this.isModified('answers')) return;
  const answers = this.answers || {};
  const answered = AXES.filter((axis) => typeof answers[axis] === 'number');
  this.answeredCount = answered.length;
  this.complete = answered.length === AXES.length;
  this.answersUpdatedAt = new Date();
});

export default mongoose.models.RoommateProfile ||
  mongoose.model('RoommateProfile', roommateProfileSchema);
