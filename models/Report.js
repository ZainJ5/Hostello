import mongoose from 'mongoose';
import { REPORT_REASON_VALUES } from '@/components/content/report-reasons';

/**
 * A report about a listing, sent from `/report-listing`.
 *
 * A REPORT IS NEVER SHOWN PUBLICLY. Nothing reads this collection on the
 * student site: not the listing page, not the reviews page, not a count
 * anywhere. It exists so a person can act on it, and the owner is told what
 * was reported so they can answer it, never who reported it. That promise is
 * made on the safety page and in the privacy policy, so it has to hold here.
 *
 * There is deliberately no admin queue for this. The admin console is frozen
 * for the 2026 redesign, so a report reaches a person by email through
 * `sendNotification` in the route rather than through a screen. The documents
 * accumulate so that a queue can be built over them later without a migration.
 *
 * `hostelId` is nullable on purpose. The page can be reached with no listing
 * in context, from the footer or from the safety page, in which case the
 * reporter types the name or the URL themselves and `hostelName` is all we
 * have. Refusing a report because we could not resolve a slug would lose
 * exactly the reports that matter most.
 */
const reportSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
      index: true,
    },
    // What the listing is called: resolved from the slug when we have one,
    // otherwise exactly what the reporter typed.
    hostelName: { type: String, required: true, trim: true, maxlength: 200 },

    reason: { type: String, enum: REPORT_REASON_VALUES, required: true, index: true },
    details: { type: String, required: true, trim: true, maxlength: 2000 },

    // Safety reasons are handled the same day and the listing comes down while
    // we check. Stored rather than derived at read time so a later queue can
    // sort on it without knowing the reason vocabulary.
    urgent: { type: Boolean, default: false, index: true },

    // Both optional: a report does not require an account, and the safety page
    // says so. When a signed in student reports, the id is kept so we can come
    // back to them without asking for an address they already gave us.
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reporterEmail: { type: String, default: '', trim: true, lowercase: true, maxlength: 200 },

    status: {
      type: String,
      enum: ['new', 'reviewing', 'actioned', 'dismissed'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

// The queue this collection is waiting for: urgent first, then oldest unread.
reportSchema.index({ status: 1, urgent: -1, createdAt: 1 });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
