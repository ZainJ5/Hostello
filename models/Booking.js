import mongoose from 'mongoose';

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
];

const bookingSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    // Denormalised so the owner still sees who enquired if the student later
    // deletes their account.
    studentName: { type: String, default: '' },
    studentEmail: { type: String, default: '' },
    studentPhone: { type: String, default: '' },

    roomType: { type: String, default: '' },
    moveInDate: { type: Date, default: null },
    durationMonths: { type: Number, default: 1, min: 1 },
    message: { type: String, default: '', maxlength: 1000 },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      index: true,
    },
    // Owner's note when confirming or rejecting.
    ownerResponse: { type: String, default: '' },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ hostelId: 1, status: 1 });
bookingSchema.index({ studentId: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
