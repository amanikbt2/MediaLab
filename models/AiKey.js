import mongoose from "mongoose";

const AiKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    exhausted: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    resetTime: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.AiKey || mongoose.model("AiKey", AiKeySchema);
