import mongoose from 'mongoose';

/**
 * There is no payment gateway. Owners transfer the listing fee out of band
 * (bank / JazzCash / Easypaisa) and upload a screenshot as proof; an admin
 * reviews the image and approves or rejects it. Approval is what publishes
 * the associated hostel.
 */
export const PAYMENT_STATUSES = ['pending', 'approved', 'rejected'];

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'JazzCash',
  'Easypaisa',
  'Raast',
  'Other',
];

const paymentSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'Bank Transfer' },
    // Bank/wallet reference the owner types in, used to reconcile against the
    // uploaded screenshot.
    transactionRef: { type: String, default: '', trim: true },
    paidAt: { type: Date, default: null },

    // Path under public/uploads/payments, served as a static file by NGINX.
    screenshot: { type: String, required: true },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },

    // Kept for the owner's billing history once the listing period lapses.
    planMonths: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
