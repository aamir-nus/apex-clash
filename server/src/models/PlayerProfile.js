import mongoose from "mongoose";

const playerProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    classType: { type: String, required: true, default: "close_combat" },
    level: { type: Number, required: true, default: 1 },
    inventoryItemIds: { type: [String], required: true, default: [] },
    equippedItemIds: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    unlockedSkillIds: { type: [String], required: true, default: [] },
    equippedSkillIds: { type: [String], required: true, default: [] },
    computedStats: { type: mongoose.Schema.Types.Mixed, required: true, default: {} }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const PlayerProfileModel =
  mongoose.models.PlayerProfile || mongoose.model("PlayerProfile", playerProfileSchema);
