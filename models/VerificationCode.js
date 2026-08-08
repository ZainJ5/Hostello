import mongoose from 'mongoose';

export const CODE_PURPOSES = ['signup', 'login', 'reset', 'delete-account'];

const verificationCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: CODE_PURPOSES, required: true },
    // Only the hash is stored, so a database leak doesn't hand out live codes.
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Mongo's TTL monitor removes documents once expiresAt passes, so expired
// codes clean themselves up without a cron job.
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationCodeSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export default mongoose.models.VerificationCode ||
  mongoose.model('VerificationCode', verificationCodeSchema);
