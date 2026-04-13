import mongoose from "mongoose";

const VirtualDbModelSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    schema: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

// TTL cleanup when expiresAt is set. MongoDB TTL monitor is async (minute-level).
VirtualDbModelSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VirtualDbModelSchema.index({ userId: 1, name: 1, createdAt: -1 });

export default VirtualDbModelSchema;

