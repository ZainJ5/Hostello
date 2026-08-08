import mongoose from 'mongoose';

/**
 * Listing lifecycle:
 *   draft            owner is still editing
 *   pending_payment  submitted; awaiting the listing fee screenshot
 *   pending_review   fee uploaded; awaiting admin approval
 *   published        live on the public site
 *   rejected         admin declined, with a reason the owner can act on
 *   suspended        pulled from public view after going live
 * Only `published` is ever returned by public queries.
 */
export const HOSTEL_STATUSES = [
  'draft',
  'pending_payment',
  'pending_review',
  'published',
  'rejected',
  'suspended',
];

export const FACILITIES = [
  'WiFi',
  'Meals',
  'Laundry',
  'CCTV',
  'Security',
  'AC',
  'Power Backup',
  'Parking',
  'Study Room',
  'Gym',
  'Kitchen',
  'Hot Water',
  'Housekeeping',
  'Prayer Area',
  'Outdoor Area',
  'Attached Bath',
  'Transport',
  'On-site Shop',
  'Common Lounge',
  'Filtered Water',
  'Elevator',
  'Furnished',
];

export const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Quad', 'Dormitory'];

const roomSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ROOM_TYPES, required: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 1, min: 1 },
    available: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, index: true },

    city: { type: String, required: true, index: true },
    area: { type: String, default: '' },
    address: { type: String, default: '' },
    universities: [{ type: String, index: true }],
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Mixed'],
      default: 'Male',
      index: true,
    },

    price: { type: Number, required: true, min: 0, index: true },
    priceMin: { type: Number, default: 0 },
    priceMax: { type: Number, default: 0 },
    rooms: [roomSchema],
    securityDeposit: { type: Number, default: 0 },

    // Denormalised from Review documents so listing cards don't need a join.
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    description: { type: String, default: '', maxlength: 4000 },
    facilities: [{ type: String }],
    rules: [{ type: String }],

    images: [{ type: String }],
    messMenuImages: [{ type: String }],
    messMenu: { type: Map, of: String, default: {} },

    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    // Distance to the nearest listed university, in km.
    distanceKm: { type: Number, default: 0 },

    contact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      email: { type: String, default: '' },
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: HOSTEL_STATUSES,
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    publishedAt: { type: Date, default: null },

    available: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    // Owner-facing engagement counters, incremented on the public site.
    views: { type: Number, default: 0 },
    contactClicks: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

hostelSchema.index({ name: 'text', area: 'text', city: 'text', description: 'text' });
hostelSchema.index({ status: 1, city: 1, gender: 1 });
hostelSchema.index({ status: 1, featured: -1, rating: -1 });
hostelSchema.index({ status: 1, price: 1 });
hostelSchema.index({ createdAt: -1 });

export default mongoose.models.Hostel || mongoose.model('Hostel', hostelSchema);
