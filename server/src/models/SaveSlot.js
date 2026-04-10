import mongoose from "mongoose";

const saveSlotSchema = new mongoose.Schema(
  {
    slotId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    level: { type: Number, required: true, default: 1 },
    regionId: { type: String, required: true, default: "hub_jujutsu_high" },
    archetypeId: { type: String, required: true },
    ownerUserId: { type: String, default: null },
    playerState: { type: mongoose.Schema.Types.Mixed, required: true },
    sessionSummary: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const SaveSlotModel = mongoose.models.SaveSlot || mongoose.model("SaveSlot", saveSlotSchema);
