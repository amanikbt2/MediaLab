import mongoose from "mongoose";

const AIContextSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  currentCode: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true },
});

AIContextSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AIContext", AIContextSchema);
