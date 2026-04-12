import mongoose from "mongoose";

const CollaborationMeetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    hostToken: {
      type: String,
      required: true,
      trim: true,
    },
    hostUserId: {
      type: String,
      default: "",
      trim: true,
    },
    hostDisplayName: {
      type: String,
      default: "",
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

CollaborationMeetingSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("CollaborationMeeting", CollaborationMeetingSchema);
