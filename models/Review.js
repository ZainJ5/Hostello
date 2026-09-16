import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Empty for reviews an admin enters on a student's behalf, for example
      // feedback collected on WhatsApp or at the hostel.
      default: null,
      index: true,
    },
    studentName: { type: String, default: '' },
    source: { type: String, enum: ['student', 'admin'], default: 'student' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    rating: { type: Number, required: true, min: 1, max: 5 },
    // Sub-scores power the ratings breakdown on the detail page.
    cleanliness: { type: Number, min: 1, max: 5, default: null },
    food: { type: Number, min: 1, max: 5, default: null },
    security: { type: Number, min: 1, max: 5, default: null },
    location: { type: Number, min: 1, max: 5, default: null },
    valueForMoney: { type: Number, min: 1, max: 5, default: null },

    title: { type: String, default: '', maxlength: 120 },
    comment: { type: String, required: true, maxlength: 2000 },

    status: {
      type: String,
      enum: ['published', 'flagged', 'removed'],
      default: 'published',
      index: true,
    },
    flagCount: { type: Number, default: 0 },
    ownerReply: { type: String, default: '' },
    ownerRepliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One review per student per hostel. Partial, so any number of admin-entered
// reviews (no studentId) can sit on the same listing.
export const REVIEW_UNIQUE_INDEX = 'hostelId_1_studentId_1_account';
reviewSchema.index(
  { hostelId: 1, studentId: 1 },
  {
    unique: true,
    name: REVIEW_UNIQUE_INDEX,
    partialFilterExpression: { studentId: { $type: 'objectId' } },
  }
);
reviewSchema.index({ hostelId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model('Review', reviewSchema);
