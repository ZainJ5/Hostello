import mongoose from 'mongoose';

/**
 * One row per listing view, retained for 90 days. Hostel.views holds the
 * lifetime total; these rows exist so owner and admin dashboards can chart
 * traffic over time and break it down by source.
 */
const pageViewSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // 'view' | 'contact' | 'save'. Contact and save are the conversion signals.
    kind: { type: String, enum: ['view', 'contact', 'save'], default: 'view', index: true },
    // Hashed visitor fingerprint; enough to deduplicate without storing IPs.
    visitor: { type: String, default: '' },
    referrer: { type: String, default: '' },
    // Indexed below with a TTL rather than `index: true` here, because
    // declaring both would create two indexes on the same key.
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
pageViewSchema.index({ hostelId: 1, kind: 1, createdAt: -1 });
pageViewSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.PageView || mongoose.model('PageView', pageViewSchema);
