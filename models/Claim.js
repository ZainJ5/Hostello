import mongoose from 'mongoose';
import { CLAIM_ROLE_VALUES, CLAIM_STATUSES } from '@/lib/claims';

/**
 * An owner asking for a listing that was built without them.
 *
 * Most of the directory came from hostels' public listings, so the listing
 * exists before its owner has ever heard of Hostello. A claim is how that
 * person takes it over: they say who they are, give the number the hostel
 * actually answers on, and attach whatever proof they have. An admin reads it
 * and either hands the listing over or does not.
 *
 * EVERYTHING THE CLAIMANT TYPED IS COPIED IN rather than joined at read time.
 * A claim is a record of what somebody asserted on a particular day. If they
 * later change their account name, or the listing is renamed, the decision
 * still has to be readable against what was in front of the admin when it was
 * made. The live user and hostel are still referenced for the approval itself.
 *
 * NOTHING HERE IS PUBLIC. No page renders a claim, not even to the claimant
 * beyond "we have it". The phone number on a pending claim is unverified, and
 * printing it on the listing before a person has looked at it is exactly the
 * failure the claim flow exists to prevent.
 */
const claimSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    // What the listing was called when the claim was filed.
    hostelName: { type: String, required: true, trim: true, maxlength: 200 },

    claimantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    claimantName: { type: String, required: true, trim: true, maxlength: 80 },
    claimantEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },

    role: { type: String, enum: CLAIM_ROLE_VALUES, required: true },

    // The number the hostel answers on. This is the payload: approving a claim
    // is mostly about putting this on the listing.
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    whatsapp: { type: String, default: '', trim: true, maxlength: 32 },

    // Free text. Deliberately not a fixed list: the useful proof varies from a
    // utility bill to "ring the number on our signboard and I will answer".
    evidence: { type: String, required: true, trim: true, maxlength: 2000 },
    proof: { type: [String], default: [] },

    status: { type: String, enum: CLAIM_STATUSES, default: 'pending', index: true },

    decisionNote: { type: String, default: '', trim: true, maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/** The queue: oldest pending first, because a claimant is waiting on it. */
claimSchema.index({ status: 1, createdAt: 1 });

/**
 * One open claim per person per listing. A partial index rather than a plain
 * unique one, so somebody who was rejected can come back with better proof
 * and somebody whose claim was approved is not blocked by their own old row.
 */
claimSchema.index(
  { hostelId: 1, claimantId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.models.Claim || mongoose.model('Claim', claimSchema);
