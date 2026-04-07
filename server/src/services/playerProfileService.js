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

  if (rewardSource === "veil_miniboss") {
    switch (classType) {
      case "mid_range":
        return "glass_veil_knot";
      case "long_range":
        return "astral_prism";
      case "heavenly_restriction":
        return "gravebinder_strap";
      case "close_combat":
      default:
        return "cataclysm_locket";
    }
  }

  if (rewardSource === "cinder_miniboss") {
    switch (classType) {
      case "mid_range":
        return "ember_knot";
      case "long_range":
        return "flare_prism";
      case "heavenly_restriction":
        return "ash_runner_wrap";
      case "close_combat":
      default:
        return "furnace_heart";
    }
  }

  return null;
}

function getRewardSkillId(classType, rewardSource) {
  if (rewardSource === "veil_boss_scroll") {
    switch (classType) {
      case "mid_range":
        return "mirror_break";
      case "long_range":
        return "void_pulse";
      case "heavenly_restriction":
        return "reaper_drive";
      case "close_combat":
      default:
        return "rupture_arc";
    }
  }

  return null;
}

function getBonusRewardItemIds(rewardSource) {
  switch (rewardSource) {
    case "dungeon_miniboss":
      return ["field_tonic", "cursed_resin"];
    case "veil_miniboss":
      return ["field_tonic", "veil_shard"];
    case "cinder_miniboss":
      return ["ember_tonic", "furnace_core"];
    case "veil_boss_scroll":
      return ["veil_shard"];
    default:
      return [];
  }
}

const ROUTE_STATE_KEYS = [
  "explorationBonus",
  "combatSnapshot",
  "dungeonRelicClaimed",
  "dungeonRelicClaimedRegionId",
  "dungeonMinibossDefeated",
  "dungeonMinibossHp",
  "sanctumShield",
  "sanctumWindowOpen",
  "cinderWindowOpen",
  "bossHp",
  "bossCleared",
  "bossRewardClaimed",
  "clearedBossRegionId",
  "signatureActive"
];

const DUNGEON_AND_BOSS_STATE_KEYS = [
  "dungeonRelicClaimed",
  "dungeonRelicClaimedRegionId",
  "dungeonMinibossDefeated",
  "dungeonMinibossHp",
  "sanctumShield",
  "sanctumWindowOpen",
  "cinderWindowOpen",
  "bossHp",
  "bossCleared",
  "bossRewardClaimed",
  "clearedBossRegionId",
  "signatureActive"
];

const BOSS_STATE_KEYS = [
  "bossHp",
  "bossCleared",
  "bossRewardClaimed",
  "clearedBossRegionId",
  "signatureActive"
];

function pruneSessionStateForRegion(existingSessionState = {}, regionId) {
  const nextSessionState = { ...(existingSessionState ?? {}) };
  const keysToRemove =
    regionId === "hub_blacksite"
      ? ROUTE_STATE_KEYS
      : regionId.endsWith("_block") || regionId.endsWith("_shrine") || regionId.endsWith("_ward")
        ? DUNGEON_AND_BOSS_STATE_KEYS
        : regionId.endsWith("_dungeon")
          ? BOSS_STATE_KEYS
          : [];

  keysToRemove.forEach((key) => {
    delete nextSessionState[key];
  });

  return nextSessionState;
}

function mergeSessionState(existingSessionState = {}, incomingSessionState = {}, regionId = null) {
  const baseSessionState = regionId
    ? pruneSessionStateForRegion(existingSessionState, regionId)
    : { ...(existingSessionState ?? {}) };

  return {
    ...baseSessionState,
    ...(incomingSessionState ?? {})
  };
}

function isRewardContextValid(rewardSource, regionId, profile) {
  const effectiveRegionId = regionId ?? profile.currentRegionId;
  const allowedRegionIdsByReward = {
    dungeon_miniboss: ["shatter_dungeon"],
    veil_miniboss: ["veil_dungeon"],
    cinder_miniboss: ["cinder_dungeon"],
    veil_boss_scroll: ["veil_boss_vault"]
  };

  const allowedRegionIds = allowedRegionIdsByReward[rewardSource];
  if (!allowedRegionIds) {
    return false;
  }

  if (!allowedRegionIds.includes(effectiveRegionId)) {
    return false;
  }

  if (
    rewardSource === "dungeon_miniboss" ||
    rewardSource === "veil_miniboss" ||
    rewardSource === "cinder_miniboss"
  ) {
    return (
      profile.sessionState?.dungeonRelicClaimed === true &&
      profile.sessionState?.dungeonRelicClaimedRegionId === effectiveRegionId
    );
  }

  if (rewardSource === "veil_boss_scroll") {
    return profile.sessionState?.clearedBossRegionId === effectiveRegionId;
  }

  return true;
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
  const unlockedSkillIds = getStarterSkills(classType);

  return {
    userId,
    classType,
    currentRegionId: "hub_blacksite",
    unlockedRegionIds: ["shatter_block"],
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
    unlockedRegionIds: profile.unlockedRegionIds ?? ["shatter_block"],
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

  if (!item.equipSlot) {
    return { error: "Item not equippable" };
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
  const normalizedSkillIds = [...new Set(skillIds)].slice(0, 2);

  const allowed = normalizedSkillIds.every((skillId) =>
    profile.unlockedSkillIds.includes(skillId)
  );
  if (!allowed) {
    return { error: "Skill not unlocked" };
  }

  profile.equippedSkillIds = normalizedSkillIds;
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
  profile.unlockedRegionIds = [
    ...new Set([
      ...(profile.unlockedRegionIds ?? ["shatter_block"]),
      ...(sessionUpdate.unlockedRegionIds ?? [])
    ])
  ];
  profile.sessionState = mergeSessionState(
    profile.sessionState,
    sessionUpdate.sessionState ?? {},
    sessionUpdate.regionId ?? null
  );

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function claimPlayerReward(userId, rewardSource, regionId, sessionState = null) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  if (sessionState && typeof sessionState === "object") {
    profile.currentRegionId = regionId ?? profile.currentRegionId;
    profile.sessionState = mergeSessionState(
      profile.sessionState,
      sessionState,
      regionId ?? null
    );
  }
  const rewardItemId = getRewardItemId(profile.classType, rewardSource);
  const rewardSkillId = getRewardSkillId(profile.classType, rewardSource);
  const bonusRewardItemIds = getBonusRewardItemIds(rewardSource);

  if (!rewardItemId && !rewardSkillId && bonusRewardItemIds.length === 0) {
    return { error: "Invalid reward source" };
  }

  if (!isRewardContextValid(rewardSource, regionId, profile)) {
    return { error: "Invalid reward context" };
  }

  if (rewardItemId) {
    const hasReward = profile.inventoryItemIds.includes(rewardItemId);
    if (!hasReward) {
      profile.inventoryItemIds = [...profile.inventoryItemIds, rewardItemId];
    }
    const grantedBonusItemIds = [];
    for (const bonusItemId of bonusRewardItemIds) {
      if (!profile.inventoryItemIds.includes(bonusItemId)) {
        profile.inventoryItemIds = [...profile.inventoryItemIds, bonusItemId];
        grantedBonusItemIds.push(bonusItemId);
      }
    }

    const storedProfile = await upsertPlayerProfileRecord(profile);
    return {
      profile: serializeProfile(storedProfile),
      reward: hasReward ? null : getItemDefinitions().find((item) => item.id === rewardItemId) ?? null,
      bonusRewards: getItemDefinitions().filter((item) => grantedBonusItemIds.includes(item.id))
    };
  }

  const hasSkillReward = profile.unlockedSkillIds.includes(rewardSkillId);
  if (!hasSkillReward) {
    profile.unlockedSkillIds = [...profile.unlockedSkillIds, rewardSkillId];
  }
  const grantedBonusItemIds = [];
  for (const bonusItemId of bonusRewardItemIds) {
    if (!profile.inventoryItemIds.includes(bonusItemId)) {
      profile.inventoryItemIds = [...profile.inventoryItemIds, bonusItemId];
      grantedBonusItemIds.push(bonusItemId);
    }
  }
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return {
    profile: serializeProfile(storedProfile),
    reward: hasSkillReward
      ? null
      : {
          ...(getSkillDefinitions().find((skill) => skill.id === rewardSkillId) ?? null),
          type: "scroll",
          rarity: "epic"
        },
    bonusRewards: getItemDefinitions().filter((item) => grantedBonusItemIds.includes(item.id))
  };
}
