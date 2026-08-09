import mongoose from 'mongoose';

/**
 * One introduction request from one student to another.
 *
 * The product never places anybody. There is no chat, no allocation and no
 * room assignment. All this collection holds is: somebody asked, and the other
 * person accepted, ignored or blocked.
 *
 * Three things about the lifecycle are deliberate:
 *
 *   - `ignored` and `blocked` are never reported back to the sender. From the
 *     sender's side an ignored request, a blocked one and one that has simply
 *     not been opened all look identical, which is the point: ignoring
 *     somebody should tell them nothing.
 *
 *   - `readAt` exists so the recipient's own list can mark what is new. It is
 *     never sent to the sender, because "read and not accepted" is the same
 *     leak as reporting a refusal.
 *
 *   - A request carries no compatibility data. The six answers are not on this
 *     document and never travel with it.
 */

export const INTRO_STATUSES = ['sent', 'accepted', 'ignored', 'blocked'];

const roommateIntroSchema = new mongoose.Schema(
  {
    fromStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Denormalised so a list renders without a second collection, and so a
    // request keeps the name it was sent under if a profile is later edited.
    fromDisplayName: { type: String, default: '', trim: true, maxlength: 60 },
    fromInitials: { type: String, default: '', trim: true, maxlength: 4 },
    fromYear: { type: String, default: '', trim: true, maxlength: 20 },
    fromProgramme: { type: String, default: '', trim: true, maxlength: 60 },

    message: { type: String, default: '', trim: true, maxlength: 500 },

    status: { type: String, enum: INTRO_STATUSES, default: 'sent', index: true },
    readAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One live request per ordered pair. A second attempt updates the first
// rather than filling the recipient's list with the same person twice.
roommateIntroSchema.index({ fromStudentId: 1, toStudentId: 1 }, { unique: true });
roommateIntroSchema.index({ toStudentId: 1, status: 1, createdAt: -1 });

export default mongoose.models.RoommateIntro ||
  mongoose.model('RoommateIntro', roommateIntroSchema);
