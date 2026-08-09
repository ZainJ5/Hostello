import mongoose from 'mongoose';
import { TOPIC_VALUES } from '@/components/community/topics';

/**
 * Ask residents.
 *
 * A question asked about one listing, and the answers residents give it. The
 * whole point of the feature is that the answer outlives the asker: the tenth
 * person to wonder about the water pressure reads the answer instead of asking
 * again. That makes a thread a durable, indexable document rather than a chat
 * message, which is why it carries its own slug and its own URL.
 *
 * Answers are subdocuments rather than their own collection. A thread is read
 * as a unit and written rarely, the answer count on a busy listing is in the
 * tens rather than the thousands, and keeping them together means a thread
 * page is one query. Each answer still carries its own id, status and flag
 * count so it can be reported and hidden on its own.
 */

/**
 * The six questions students ask most, and the only vocabulary the answer
 * coverage strip draws. `other` exists so a real question is never forced into
 * the wrong bucket, and it deliberately does not appear in the strip.
 *
 * The list itself lives in `components/community/topics.js` and is imported
 * from there rather than declared twice. The direction matters: that file
 * imports nothing, so the ask form can use it on the client without dragging
 * Mongoose into the browser bundle, which is exactly what happened when the
 * dependency ran the other way.
 */
export const ASK_TOPICS = TOPIC_VALUES;
export const ASK_TOPIC_VALUES = [...TOPIC_VALUES, 'other'];

/** Flags needed before content drops out of public view, as reviews use. */
export const AUTO_FLAG_THRESHOLD = 3;

const answerSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 1200 },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Denormalised so a thread renders without a join, and so an answer keeps
    // its attribution if the account is later deleted.
    authorName: { type: String, default: '' },

    status: {
      type: String,
      enum: ['published', 'flagged', 'removed'],
      default: 'published',
    },
    flagCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const askThreadSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    // Denormalised so every list of threads can build its links without
    // loading the listing, including the cross listing index at /community.
    hostelSlug: { type: String, required: true, index: true },
    hostelName: { type: String, default: '' },

    question: { type: String, required: true, trim: true, maxlength: 200 },

    /**
     * Lowercased, punctuation stripped form of the question. The unique index
     * below uses it to stop the same question being asked twice on one
     * listing, which is the behaviour the page promises in its own words.
     */
    questionKey: { type: String, required: true },

    /** Stable, human readable URL segment. See lib note in the ask route. */
    threadSlug: { type: String, required: true, unique: true, index: true },

    topic: { type: String, enum: ASK_TOPIC_VALUES, default: 'other', index: true },

    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    askedByName: { type: String, default: '' },

    answers: { type: [answerSchema], default: [] },

    /**
     * Count of answers still in `published`. Maintained on write so the index
     * pages and the coverage strip never have to unwind the array.
     */
    answerCount: { type: Number, default: 0, min: 0 },

    /**
     * A nudge is anonymous by design: it reminds residents a question is open
     * and never names the person who sent it, so only the total is stored.
     */
    nudgeCount: { type: Number, default: 0, min: 0 },

    lastAnswerAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['open', 'answered', 'hidden'],
      default: 'open',
      index: true,
    },
    flagCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One question per listing. Two students asking the same thing an hour apart
// would otherwise split the answers across two threads and neither would look
// answered.
askThreadSchema.index({ hostelId: 1, questionKey: 1 }, { unique: true });

// The listing page reads open and answered threads newest activity first.
askThreadSchema.index({ hostelId: 1, status: 1, lastAnswerAt: -1, createdAt: -1 });

// The coverage strip asks, per listing, which topics have a published answer.
askThreadSchema.index({ hostelId: 1, topic: 1, answerCount: 1 });

// The cross listing index at /community reads recently answered threads.
askThreadSchema.index({ status: 1, lastAnswerAt: -1 });

export default mongoose.models.AskThread ||
  mongoose.model('AskThread', askThreadSchema);
