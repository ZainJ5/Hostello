import mongoose from 'mongoose';

export const ROLES = ['student', 'owner', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Selected explicitly only where needed so queries never leak the hash.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student', index: true },

    emailVerified: { type: Boolean, default: false },
    // Set when a verified user requests deletion; the account is purged once
    // they confirm with the emailed code.
    pendingDeletionAt: { type: Date, default: null },

    phone: { type: String, default: '', trim: true },
    university: { type: String, default: '' },
    city: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    avatar: { type: String, default: '' },

    // Owner-only fields, collected during the listing flow.
    businessName: { type: String, default: '' },
    cnic: { type: String, default: '' },

    savedHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }],

    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
