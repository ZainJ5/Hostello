import mongoose from 'mongoose';

/**
 * Platform-wide configuration edited from /admin/settings. Stored as a single
 * document keyed `platform` so reads are a one-document lookup and the shape
 * can grow without a migration.
 */
const accountSchema = new mongoose.Schema(
  {
    label: { type: String, default: '' },
    method: {
      type: String,
      enum: ['Bank Transfer', 'JazzCash', 'Easypaisa', 'Raast', 'Other'],
      default: 'Bank Transfer',
    },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'platform', unique: true, index: true },

    // What an owner pays to get a listing reviewed and published.
    listingFee: { type: Number, default: 5000, min: 0 },
    listingPeriodMonths: { type: Number, default: 6, min: 1 },

    // Rendered verbatim on the owner's payment screen.
    paymentInstructions: {
      type: String,
      default:
        'Transfer the listing fee to one of the accounts below, then upload a clear screenshot of the receipt. Approval usually takes under 24 hours.',
      maxlength: 2000,
    },
    accounts: { type: [accountSchema], default: [] },

    // How many listings may carry `featured: true` at once.
    featuredSlots: { type: Number, default: 8, min: 0 },

    supportEmail: { type: String, default: 'support@hostello.tech' },
    supportPhone: { type: String, default: '' },

    // When off, approving a payment leaves the hostel in review for a
    // second pair of eyes instead of publishing it immediately.
    autoPublishOnApproval: { type: Boolean, default: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const SETTINGS_KEY = 'platform';

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
