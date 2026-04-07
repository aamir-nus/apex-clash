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
    computedStats: clone(document.computedStats)
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
    profiles.set(profile.userId, clone(profile));
    return clone(profile);
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
        computedStats: profile.computedStats
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
