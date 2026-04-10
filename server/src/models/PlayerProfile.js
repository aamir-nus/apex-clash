import mongoose from "mongoose";

const playerProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    classType: { type: String, required: true, default: "striker" },
    currentRegionId: { type: String, required: true, default: "hub_jujutsu_high" },
    unlockedRegionIds: { type: [String], required: true, default: ["detention_center"] },
    clearedRegionIds: { type: [String], required: true, default: [] },
    level: { type: Number, required: true, default: 1 },
    xp: { type: Number, required: true, default: 0 },
    xpToNextLevel: { type: Number, required: true, default: 30 },
    pendingStatPoints: { type: Number, required: true, default: 0 },
    statAllocations: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    sessionState: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    inventoryItemIds: { type: [String], required: true, default: [] },
    equippedItemIds: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    unlockedSkillIds: { type: [String], required: true, default: [] },
    equippedSkillIds: { type: [String], required: true, default: [] },
    computedStats: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    // Phase 4: Grade progression fields
    sorcererGrade: { type: String, required: true, default: "grade_4" },
    gradePromotionProgress: { type: Number, required: true, default: 0 },
    gradeKillLedger: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    firstGradeTrialClears: { type: [String], required: true, default: [] },
    specialGradeCandidate: { type: Boolean, required: true, default: false },
    specialGradeSightings: { type: [String], required: true, default: [] },
    specialGradeKills: { type: [String], required: true, default: [] },
    // Phase 4B: Technique mastery fields
    techniqueMasteryRank: { type: String, required: true, default: "novice" },
    techniqueMasteryProgress: { type: Number, required: true, default: 0 },
    techniqueUsageCount: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    bossKillCount: { type: Number, required: true, default: 0 },
    blackFlashChainCount: { type: Number, required: true, default: 0 },
    domainClashCount: { type: Number, required: true, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const PlayerProfileModel =
  mongoose.models.PlayerProfile || mongoose.model("PlayerProfile", playerProfileSchema);
