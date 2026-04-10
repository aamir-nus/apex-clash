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

  if (rewardSource === "night_miniboss") {
    switch (classType) {
      case "mid_range":
        return "cathedral_knot";
      case "long_range":
        return "moonwire_prism";
      case "heavenly_restriction":
        return "stalker_shroud";
      case "close_combat":
      default:
        return "night_iron_chain";
    }
  }

  if (rewardSource === "cinder_boss_core") {
    switch (classType) {
      case "mid_range":
        return "phoenix_loop";
      case "long_range":
        return "sunflare_prism";
      case "heavenly_restriction":
        return "kiln_tread";
      case "close_combat":
      default:
        return "caldera_emblem";
    }
  }

  return null;
}

function getRewardSkillId(classType, rewardSource) {
  if (rewardSource === "shatter_boss_scroll") {
    switch (classType) {
      case "mid_range":
        return "thread_lance";
      case "long_range":
        return "comet_array";
      case "heavenly_restriction":
        return "predator_dive";
      case "close_combat":
      default:
        return "sever_flash";
    }
  }

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

  if (rewardSource === "night_boss_scroll") {
    switch (classType) {
      case "mid_range":
        return "eclipse_weave";
      case "long_range":
        return "black_starfall";
      case "heavenly_restriction":
        return "apex_predator";
      case "close_combat":
      default:
        return "moon_cleave";
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
    case "night_miniboss":
      return ["midnight_tonic", "night_ichor"];
    case "shatter_boss_scroll":
      return ["field_tonic", "cursed_resin"];
    case "veil_boss_scroll":
      return ["veil_shard"];
    case "cinder_boss_core":
      return ["ember_tonic", "furnace_core"];
    case "night_boss_scroll":
      return ["midnight_tonic", "night_ichor"];
    default:
      return [];
  }
}

function getCraftRecipes() {
  return [
    {
      id: "craft_resin_elixir",
      resultItemId: "resin_elixir",
      ingredientIds: ["cursed_resin", "veil_shard"]
    },
    {
      id: "craft_furnace_draught",
      resultItemId: "furnace_draught",
      ingredientIds: ["cursed_resin", "furnace_core"]
    }
  ];
}

function mapBossVaultToClearedRegion(regionId) {
  return regionId === "shatter_boss_vault"
    ? "shatter_block"
    : regionId === "veil_boss_vault"
      ? "veil_shrine"
      : regionId === "cinder_boss_vault"
        ? "cinder_ward"
        : regionId === "night_boss_vault"
          ? "night_cathedral"
        : null;
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
    night_miniboss: ["night_dungeon"],
    shatter_boss_scroll: ["shatter_boss_vault"],
    veil_boss_scroll: ["veil_boss_vault"],
    cinder_boss_core: ["cinder_boss_vault"],
    night_boss_scroll: ["night_boss_vault"]
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
    rewardSource === "cinder_miniboss" ||
    rewardSource === "night_miniboss"
  ) {
    return (
      profile.sessionState?.dungeonRelicClaimed === true &&
      profile.sessionState?.dungeonRelicClaimedRegionId === effectiveRegionId
    );
  }

  if (
    rewardSource === "shatter_boss_scroll" ||
    rewardSource === "veil_boss_scroll" ||
    rewardSource === "cinder_boss_core" ||
    rewardSource === "night_boss_scroll"
  ) {
    return profile.sessionState?.clearedBossRegionId === effectiveRegionId;
  }

  return true;
}

function computeStats(classType, equippedItemIds, statAllocations = {}) {
  return computeStatsWithBuffs(classType, equippedItemIds, statAllocations, []);
}

function computeStatsWithBuffs(classType, equippedItemIds, statAllocations = {}, activeBuffItemIds = []) {
  const classDefinition = getClassDefinition(classType);
  const items = getItemDefinitions();
  const baseStats = structuredClone(classDefinition?.baseStats ?? {});
  const equippedItems = items.filter((item) => Object.values(equippedItemIds).includes(item.id));
  const activeBuffItems = items.filter((item) => activeBuffItemIds.includes(item.id));

  for (const item of [...equippedItems, ...activeBuffItems]) {
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

function normalizeInventory(profile) {
  const inventoryCounts = { ...(profile.inventoryCounts ?? {}) };
  const inventoryItemIds = [...new Set(profile.inventoryItemIds ?? [])];

  inventoryItemIds.forEach((itemId) => {
    inventoryCounts[itemId] = Math.max(1, inventoryCounts[itemId] ?? 1);
  });

  Object.keys(inventoryCounts).forEach((itemId) => {
    if ((inventoryCounts[itemId] ?? 0) <= 0) {
      delete inventoryCounts[itemId];
    }
  });

  profile.inventoryItemIds = inventoryItemIds.filter((itemId) => (inventoryCounts[itemId] ?? 0) > 0);
  profile.inventoryCounts = inventoryCounts;
}

function hasInventoryItem(profile, itemId, quantity = 1) {
  normalizeInventory(profile);
  return (profile.inventoryCounts[itemId] ?? 0) >= quantity;
}

function addInventoryItem(profile, itemId, quantity = 1) {
  normalizeInventory(profile);
  profile.inventoryCounts[itemId] = (profile.inventoryCounts[itemId] ?? 0) + quantity;
  if (!profile.inventoryItemIds.includes(itemId)) {
    profile.inventoryItemIds = [...profile.inventoryItemIds, itemId];
  }
}

function consumeInventoryItem(profile, itemId, quantity = 1) {
  normalizeInventory(profile);
  if (!hasInventoryItem(profile, itemId, quantity)) {
    return false;
  }

  profile.inventoryCounts[itemId] -= quantity;
  if (profile.inventoryCounts[itemId] <= 0) {
    delete profile.inventoryCounts[itemId];
    profile.inventoryItemIds = profile.inventoryItemIds.filter((entry) => entry !== itemId);
  }

  return true;
}

function getActiveConsumableIds(profile) {
  return (profile.sessionState?.activeConsumableIds ?? []).filter(Boolean);
}

function recomputeProfileStats(profile) {
  profile.computedStats = computeStatsWithBuffs(
    profile.classType,
    profile.equippedItemIds,
    profile.statAllocations,
    getActiveConsumableIds(profile)
  );
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
    clearedRegionIds: [],
    level: 1,
    xp: 0,
    xpToNextLevel: 30,
    pendingStatPoints: 0,
    statAllocations,
    sessionState: {},
    inventoryItemIds: [...new Set(Object.values(equippedItemIds))],
    inventoryCounts: Object.fromEntries(
      [...new Set(Object.values(equippedItemIds))].map((itemId) => [itemId, 1])
    ),
    equippedItemIds,
    unlockedSkillIds,
    equippedSkillIds,
    computedStats: computeStats(classType, equippedItemIds, statAllocations)
  };
}

function serializeProfile(profile) {
  const content = getBootstrapContent();
  normalizeInventory(profile);
  const inventoryItems = content.items
    .filter((item) => profile.inventoryItemIds.includes(item.id))
    .map((item) => ({
      ...item,
      quantity: profile.inventoryCounts?.[item.id] ?? 1
    }));
  const equippedItems = content.items.filter((item) =>
    Object.values(profile.equippedItemIds).includes(item.id)
  );
  const availableSkills = content.skills.filter((skill) => profile.unlockedSkillIds.includes(skill.id));
  const equippedSkills = content.skills.filter((skill) => profile.equippedSkillIds.includes(skill.id));
  const craftRecipes = getCraftRecipes().map((recipe) => ({
    id: recipe.id,
    result: content.items.find((item) => item.id === recipe.resultItemId) ?? null,
    ingredients: recipe.ingredientIds
      .map((itemId) => content.items.find((item) => item.id === itemId))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        quantity: 1,
        owned: profile.inventoryCounts?.[item.id] ?? 0
      })),
    canCraft: recipe.ingredientIds.every((itemId) => hasInventoryItem(profile, itemId, 1))
  }));

  return {
    userId: profile.userId,
    classType: profile.classType,
    currentRegionId: profile.currentRegionId,
    unlockedRegionIds: profile.unlockedRegionIds ?? ["shatter_block"],
    clearedRegionIds: profile.clearedRegionIds ?? [],
    level: profile.level,
    xp: profile.xp,
    xpToNextLevel: profile.xpToNextLevel,
    pendingStatPoints: profile.pendingStatPoints,
    statAllocations: profile.statAllocations,
    sessionState: profile.sessionState,
    computedStats: profile.computedStats,
    inventoryItems,
    inventoryCounts: profile.inventoryCounts,
    equippedItems,
    availableSkills,
    equippedSkills,
    activeConsumableIds: getActiveConsumableIds(profile),
    craftRecipes,
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
  normalizeInventory(profile);

  const item = getItemDefinitions().find((entry) => entry.id === itemId);
  if (!item || !hasInventoryItem(profile, itemId, 1)) {
    return { error: "Item not available" };
  }

  if (!item.equipSlot) {
    return { error: "Item not equippable" };
  }

  if (item.classRestrictions?.length && !item.classRestrictions.includes(profile.classType)) {
    return { error: "Item incompatible with classType" };
  }

  profile.equippedItemIds[item.equipSlot] = item.id;
  recomputeProfileStats(profile);
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
  recomputeProfileStats(profile);

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
  const derivedClearedRegionId = mapBossVaultToClearedRegion(
    sessionUpdate.sessionState?.clearedBossRegionId ?? null
  );

  profile.currentRegionId = sessionUpdate.regionId ?? profile.currentRegionId;
  profile.unlockedRegionIds = [
    ...new Set([
      ...(profile.unlockedRegionIds ?? ["shatter_block"]),
      ...(sessionUpdate.unlockedRegionIds ?? [])
    ])
  ];
  profile.clearedRegionIds = [
    ...new Set([
      ...(profile.clearedRegionIds ?? []),
      ...(sessionUpdate.clearedRegionIds ?? []),
      ...(derivedClearedRegionId ? [derivedClearedRegionId] : [])
    ])
  ];
  profile.sessionState = mergeSessionState(
    profile.sessionState,
    sessionUpdate.sessionState ?? {},
    sessionUpdate.regionId ?? null
  );
  recomputeProfileStats(profile);

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return { profile: serializeProfile(storedProfile) };
}

export async function claimPlayerReward(userId, rewardSource, regionId, sessionState = null) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  normalizeInventory(profile);
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

  if (regionId?.endsWith("_boss_vault")) {
    const clearedRegionId = mapBossVaultToClearedRegion(regionId);

    if (clearedRegionId) {
      profile.clearedRegionIds = [
        ...new Set([...(profile.clearedRegionIds ?? []), clearedRegionId])
      ];
    }
  }

  if (rewardItemId) {
    const rewardDefinition = getItemDefinitions().find((item) => item.id === rewardItemId) ?? null;
    const isStackableReward = ["consumable", "material"].includes(rewardDefinition?.type ?? "");
    const hasReward = hasInventoryItem(profile, rewardItemId, 1);
    if (!hasReward || isStackableReward) {
      addInventoryItem(profile, rewardItemId, 1);
    }
    const grantedBonusItemIds = [];
    for (const bonusItemId of bonusRewardItemIds) {
      addInventoryItem(profile, bonusItemId, 1);
      grantedBonusItemIds.push(bonusItemId);
    }

    const storedProfile = await upsertPlayerProfileRecord(profile);
    return {
      profile: serializeProfile(storedProfile),
      reward: hasReward && !isStackableReward ? null : rewardDefinition,
      bonusRewards: getItemDefinitions().filter((item) => grantedBonusItemIds.includes(item.id))
    };
  }

  const hasSkillReward = profile.unlockedSkillIds.includes(rewardSkillId);
  if (!hasSkillReward) {
    profile.unlockedSkillIds = [...profile.unlockedSkillIds, rewardSkillId];
  }
  const grantedBonusItemIds = [];
  for (const bonusItemId of bonusRewardItemIds) {
    addInventoryItem(profile, bonusItemId, 1);
    grantedBonusItemIds.push(bonusItemId);
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

export async function usePlayerConsumable(userId, itemId) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  normalizeInventory(profile);
  const item = getItemDefinitions().find((entry) => entry.id === itemId);

  if (!item || item.type !== "consumable") {
    return { error: "Consumable not available" };
  }

  if (!consumeInventoryItem(profile, itemId, 1)) {
    return { error: "Consumable not available" };
  }

  profile.sessionState = {
    ...(profile.sessionState ?? {}),
    activeConsumableIds: [itemId]
  };
  recomputeProfileStats(profile);
  const storedProfile = await upsertPlayerProfileRecord(profile);
  return {
    profile: serializeProfile(storedProfile),
    effect: item
  };
}

export async function craftPlayerInventoryItem(userId, recipeId) {
  const profile = (await getPlayerProfileRecord(userId)) ?? buildProfile(userId);
  normalizeInventory(profile);
  const recipe = getCraftRecipes().find((entry) => entry.id === recipeId);

  if (!recipe) {
    return { error: "Recipe not available" };
  }

  const canCraft = recipe.ingredientIds.every((itemId) => hasInventoryItem(profile, itemId, 1));
  if (!canCraft) {
    return { error: "Missing crafting materials" };
  }

  recipe.ingredientIds.forEach((itemId) => {
    consumeInventoryItem(profile, itemId, 1);
  });
  addInventoryItem(profile, recipe.resultItemId, 1);
  recomputeProfileStats(profile);

  const storedProfile = await upsertPlayerProfileRecord(profile);
  return {
    profile: serializeProfile(storedProfile),
    craftedItem: getItemDefinitions().find((item) => item.id === recipe.resultItemId) ?? null,
    consumedItemIds: recipe.ingredientIds
  };
}
