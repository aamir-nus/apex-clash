import mongoose from "mongoose";
import { PlayerProfileModel } from "../models/PlayerProfile.js";

const profiles = new Map();

function clone(value) {
  return structuredClone(value);
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function serializeMongoProfile(document) {
  return {
    userId: document.userId,
    classType: document.classType,
    currentRegionId: document.currentRegionId,
    unlockedRegionIds: clone(document.unlockedRegionIds),
    clearedRegionIds: clone(document.clearedRegionIds ?? []),
    level: document.level,
    xp: document.xp,
    xpToNextLevel: document.xpToNextLevel,
    pendingStatPoints: document.pendingStatPoints,
    statAllocations: clone(document.statAllocations),
    sessionState: clone(document.sessionState),
    inventoryItemIds: clone(document.inventoryItemIds),
    equippedItemIds: clone(document.equippedItemIds),
    unlockedSkillIds: clone(document.unlockedSkillIds),
    equippedSkillIds: clone(document.equippedSkillIds),
    computedStats: clone(document.computedStats),
    // Phase 4: Grade progression fields
    sorcererGrade: document.sorcererGrade ?? "grade_4",
    gradePromotionProgress: document.gradePromotionProgress ?? 0,
    gradeKillLedger: clone(document.gradeKillLedger ?? {}),
    firstGradeTrialClears: clone(document.firstGradeTrialClears ?? []),
    specialGradeCandidate: document.specialGradeCandidate ?? false,
    specialGradeSightings: clone(document.specialGradeSightings ?? []),
    specialGradeKills: clone(document.specialGradeKills ?? []),
    // Phase 4B: Technique mastery fields
    techniqueMasteryRank: document.techniqueMasteryRank ?? "novice",
    techniqueMasteryProgress: document.techniqueMasteryProgress ?? 0,
    techniqueUsageCount: clone(document.techniqueUsageCount ?? {}),
    bossKillCount: document.bossKillCount ?? 0,
    blackFlashChainCount: document.blackFlashChainCount ?? 0,
    domainClashCount: document.domainClashCount ?? 0
  };
}

export async function getPlayerProfileRecord(userId) {
  if (!isMongoReady()) {
    const profile = profiles.get(userId);
    return profile ? clone(profile) : null;
  }

  const document = await PlayerProfileModel.findOne({ userId }).lean();
  return document ? serializeMongoProfile(document) : null;
}

export async function upsertPlayerProfileRecord(profile) {
  if (!isMongoReady()) {
    const completeProfile = {
      sorcererGrade: profile.sorcererGrade ?? "grade_4",
      gradePromotionProgress: profile.gradePromotionProgress ?? 0,
      gradeKillLedger: profile.gradeKillLedger ?? {},
      firstGradeTrialClears: profile.firstGradeTrialClears ?? [],
      specialGradeCandidate: profile.specialGradeCandidate ?? false,
      specialGradeSightings: profile.specialGradeSightings ?? [],
      specialGradeKills: profile.specialGradeKills ?? [],
      techniqueMasteryRank: profile.techniqueMasteryRank ?? "novice",
      techniqueMasteryProgress: profile.techniqueMasteryProgress ?? 0,
      techniqueUsageCount: profile.techniqueUsageCount ?? {},
      bossKillCount: profile.bossKillCount ?? 0,
      blackFlashChainCount: profile.blackFlashChainCount ?? 0,
      domainClashCount: profile.domainClashCount ?? 0,
      ...profile
    };
    profiles.set(profile.userId, clone(completeProfile));
    return clone(completeProfile);
  }

  const document = await PlayerProfileModel.findOneAndUpdate(
    { userId: profile.userId },
    {
      $set: {
        classType: profile.classType,
        currentRegionId: profile.currentRegionId,
        unlockedRegionIds: profile.unlockedRegionIds,
        clearedRegionIds: profile.clearedRegionIds ?? [],
        level: profile.level,
        xp: profile.xp,
        xpToNextLevel: profile.xpToNextLevel,
        pendingStatPoints: profile.pendingStatPoints,
        statAllocations: profile.statAllocations,
        sessionState: profile.sessionState,
        inventoryItemIds: profile.inventoryItemIds,
        equippedItemIds: profile.equippedItemIds,
        unlockedSkillIds: profile.unlockedSkillIds,
        equippedSkillIds: profile.equippedSkillIds,
        computedStats: profile.computedStats,
        // Phase 4: Grade progression fields
        sorcererGrade: profile.sorcererGrade ?? "grade_4",
        gradePromotionProgress: profile.gradePromotionProgress ?? 0,
        gradeKillLedger: profile.gradeKillLedger ?? {},
        firstGradeTrialClears: profile.firstGradeTrialClears ?? [],
        specialGradeCandidate: profile.specialGradeCandidate ?? false,
        specialGradeSightings: profile.specialGradeSightings ?? [],
        specialGradeKills: profile.specialGradeKills ?? [],
        // Phase 4B: Technique mastery fields
        techniqueMasteryRank: profile.techniqueMasteryRank ?? "novice",
        techniqueMasteryProgress: profile.techniqueMasteryProgress ?? 0,
        techniqueUsageCount: profile.techniqueUsageCount ?? {},
        bossKillCount: profile.bossKillCount ?? 0,
        blackFlashChainCount: profile.blackFlashChainCount ?? 0,
        domainClashCount: profile.domainClashCount ?? 0
      }
    },
    {
      upsert: true,
      new: true,
      lean: true
    }
  );

  return serializeMongoProfile(document);
}
