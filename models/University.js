import mongoose from 'mongoose';

/**
 * Universities added or edited from the admin panel.
 *
 * The built-in campus list in `components/hostels/campuses.js` stays the
 * fallback. A row here with the same `key` as a built-in overrides its name
 * and pin, and a row with a new `key` adds a campus. `key` is the tag stored
 * in `Hostel.universities`, so it never changes once saved.
 */
const universitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    full: { type: String, required: true, trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    sector: { type: String, default: '', trim: true, maxlength: 80 },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.University || mongoose.model('University', universitySchema);
