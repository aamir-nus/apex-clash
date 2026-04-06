import { getClassDefinition, getClassDefinitions, getBootstrapContent } from "./contentService.js";
import {
  getPlayerProfileRecord,
  upsertPlayerProfileRecord
} from "./playerProfileRepository.js";

function getItemDefinitions() {
  return getBootstrapContent().items;
}

function getSkillDefinitions() {
  return getBootstrapContent().skills;
}

function getStarterLoadout(classType) {
  switch (classType) {
    case "mid_range":
      return { weapon: "pulse_tanto", charm: "focus_charm" };
    case "long_range":
      return { weapon: "ritual_focus", charm: "focus_charm" };
    case "heavenly_restriction":
      return { weapon: "grave_polearm", charm: "hunter_sash" };
    case "close_combat":
    default:
      return { weapon: "breach_blade", charm: "rust_talisman" };
  }
}

function getStarterSkills(classType) {
  switch (classType) {
    case "mid_range":
      return ["shard_arc", "veil_sweep"];
    case "long_range":
      return ["shard_arc", "starfall_lance"];
    case "heavenly_restriction":
      return ["predator_sense", "bone_breaker"];
    case "close_combat":
    default:
      return ["cleave_step", "iron_maelstrom"];
  }
}

function getRewardItemId(classType, rewardSource) {
  if (rewardSource === "dungeon_miniboss") {
    switch (classType) {
      case "mid_range":
        return "echo_band";
      case "long_range":
        return "prism_seal";
      case "heavenly_restriction":
        return "butcher_wrap";
      case "close_combat":
      default:
        return "siege_anklet";
    }
  }

  return null;
}

function computeStats(classType, equippedItemIds, statAllocations = {}) {
  const classDefinition = getClassDefinition(classType);
  const items = getItemDefinitions();
  const baseStats = structuredClone(classDefinition?.baseStats ?? {});
  const equippedItems = items.filter((item) => Object.values(equippedItemIds).includes(item.id));

  for (const item of equippedItems) {
    for (const [key, value] of Object.entries(item.statModifiers ?? {})) {
      baseStats[key] = (baseStats[key] ?? 0) + value;
    }
  }

  baseStats.attack = (baseStats.attack ?? 0) + (statAllocations.attack ?? 0) * 2;
  baseStats.defense = (baseStats.defense ?? 0) + (statAllocations.defense ?? 0);
  baseStats.hp = (baseStats.hp ?? 0) + (statAllocations.defense ?? 0) * 10;
  baseStats.speed = (baseStats.speed ?? 0) + (statAllocations.speed ?? 0);
  baseStats.ce = (baseStats.ce ?? 0) + (statAllocations.attack ?? 0) * 4;

  return {
    hp: baseStats.hp ?? 0,
    ce: baseStats.ce ?? 0,
    attack: baseStats.attack ?? 0,
    defense: baseStats.defense ?? 0,
    speed: baseStats.speed ?? 0,
    technique: baseStats.technique ?? 0,
    perception: baseStats.perception ?? 0,
    crit: baseStats.crit ?? 0,
    poise: baseStats.poise ?? 0
  };
}

function getXpThreshold(level) {
  return 30 + (level - 1) * 20;
}

function buildProfile(userId, classType = "close_combat") {
  const equippedItemIds = getStarterLoadout(classType);
  const equippedSkillIds = getStarterSkills(classType);
  const statAllocations = {
    attack: 0,
    defense: 0,
    speed: 0
  };
  const unlockedSkillIds = getSkillDefinitions()
    .filter((skill) => !skill.classRestrictions?.length || skill.classRestrictions.includes(classType))
    .map((skill) => skill.id);

  return {
    userId,
    classType,
    currentRegionId: "hub_blacksite",
    level: 1,
    xp: 0,
    xpToNextLevel: 30,
    pendingStatPoints: 0,
    statAllocations,
    sessionState: {},
    inventoryItemIds: [...new Set(Object.values(equippedItemIds))],
    equippedItemIds,
    unlockedSkillIds,
    equippedSkillIds,
    computedStats: computeStats(classType, equippedItemIds, statAllocations)
  };
}

function serializeProfile(profile) {
  const content = getBootstrapContent();
  const inventoryItems = content.items.filter((item) => profile.inventoryItemIds.includes(item.id));
  const equippedItems = content.items.filter((item) =>
    Object.values(profile.equippedItemIds).includes(item.id)
  );
  const availableSkills = content.skills.filter((skill) => profile.unlockedSkillIds.includes(skill.id));
  const equippedSkills = content.skills.filter((skill) => profile.equippedSkillIds.includes(skill.id));

  return {
    userId: profile.userId,
    classType: profile.classType,
    currentRegionId: profile.currentRegionId,
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: profile.xpToNextLevel,
    pendingStatPoints: profile.pendingStatPoints,
    statAllocations: profile.statAllocations,
    sessionState: profile.sessionState,
    computedStats: profile.computedStats,
    inventoryItems,
    equippedItems,
    availableSkills,
    equippedSkills,
    classOptions: getClassDefinitions().map((entry) => ({
      id: entry.id,
      name: entry.name,
      combatStyle: entry.combatStyle
    }))
  };
}

export async function getOrCreatePlayerProfile(userId) {
  const existingProfile = await getPlayerProfileRecord(userId);
  if (existingProfile) {
    return serializeProfile(existingProfile);
  }

  const profile = buildProfile(userId);
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return serializeProfile(storedProfile);
}

export async function setPlayerClassType(userId, classType) {
  const classDefinition = getClassDefinition(classType);
  if (!classDefinition) {
    return { error: "Invalid classType" };
  }

  const profile = buildProfile(userId, classType);
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function equipPlayerItem(userId, itemId) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);

  const item = getItemDefinitions().find((entry) => entry.id === itemId);
  if (!item || !profile.inventoryItemIds.includes(itemId)) {
    return { error: "Item not available" };
  }

  if (item.classRestrictions?.length && !item.classRestrictions.includes(profile.classType)) {
    return { error: "Item incompatible with classType" };
  }

  profile.equippedItemIds[item.equipSlot] = item.id;
  profile.computedStats = computeStats(
    profile.classType,
    profile.equippedItemIds,
    profile.statAllocations
  );
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function equipPlayerSkills(userId, skillIds) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);

  const allowed = skillIds.every((skillId) => profile.unlockedSkillIds.includes(skillId));
  if (!allowed) {
    return { error: "Skill not unlocked" };
  }

  profile.equippedSkillIds = skillIds.slice(0, 4);
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function applyPlayerProgressionChoice(userId, optionId, runtimeState = {}) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);

  profile.level = Number.isFinite(runtimeState.level) ? runtimeState.level : profile.level;
  profile.xp = Number.isFinite(runtimeState.xp) ? runtimeState.xp : profile.xp;
  profile.xpToNextLevel = Number.isFinite(runtimeState.xpToNextLevel)
    ? runtimeState.xpToNextLevel
    : profile.xpToNextLevel;
  profile.pendingStatPoints = Number.isFinite(runtimeState.pendingStatPoints)
    ? runtimeState.pendingStatPoints
    : profile.pendingStatPoints;

  if (profile.pendingStatPoints <= 0) {
    return { error: "No pending stat points" };
  }

  if (!["attack", "defense", "speed"].includes(optionId)) {
    return { error: "Invalid progression option" };
  }

  profile.statAllocations = {
    attack: profile.statAllocations?.attack ?? 0,
    defense: profile.statAllocations?.defense ?? 0,
    speed: profile.statAllocations?.speed ?? 0
  };
  profile.statAllocations[optionId] += 1;
  profile.pendingStatPoints -= 1;
  profile.computedStats = computeStats(
    profile.classType,
    profile.equippedItemIds,
    profile.statAllocations
  );

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function applyPlayerCombatReward(userId, rewardState = {}) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  const xpGained = Number.isFinite(rewardState.xpGained) ? Math.max(0, rewardState.xpGained) : 0;

  profile.level = Number.isFinite(rewardState.level) ? rewardState.level : profile.level;
  profile.xp = Number.isFinite(rewardState.xp) ? rewardState.xp : profile.xp;
  profile.pendingStatPoints = Number.isFinite(rewardState.pendingStatPoints)
    ? rewardState.pendingStatPoints
    : profile.pendingStatPoints;
  profile.xpToNextLevel = getXpThreshold(profile.level);
  profile.xp += xpGained;

  while (profile.xp >= profile.xpToNextLevel) {
    profile.xp -= profile.xpToNextLevel;
    profile.level += 1;
    profile.pendingStatPoints += 1;
    profile.xpToNextLevel = getXpThreshold(profile.level);
  }

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function updatePlayerSessionState(userId, sessionUpdate = {}) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);

  profile.currentRegionId = sessionUpdate.regionId ?? profile.currentRegionId;
  profile.sessionState = {
    ...(profile.sessionState ?? {}),
    ...(sessionUpdate.sessionState ?? {})
  };

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function claimPlayerReward(userId, rewardSource) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  const rewardItemId = getRewardItemId(profile.classType, rewardSource);

  if (!rewardItemId) {
    return { error: "Invalid reward source" };
  }

  const hasReward = profile.inventoryItemIds.includes(rewardItemId);
  if (!hasReward) {
    profile.inventoryItemIds = [...profile.inventoryItemIds, rewardItemId];
  }

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return {
    profile: serializeProfile(storedProfile),
    reward: hasReward ? null : getItemDefinitions().find((item) => item.id === rewardItemId) ?? null
  };
}
