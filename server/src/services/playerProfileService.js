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
    case "technique_fighter":
      return { weapon: "pulse_tanto", charm: "focus_charm" };
    case "projection_sorcerer":
      return { weapon: "ritual_focus", charm: "focus_charm" };
    case "heavenly_restriction":
      return { weapon: "grave_polearm", charm: "hunter_sash" };
    case "striker":
    default:
      return { weapon: "breach_blade", charm: "rust_talisman" };
  }
}

function getStarterSkills(classType) {
  switch (classType) {
    case "technique_fighter":
      return ["fragment_arc", "curtain_sweep"];
    case "projection_sorcerer":
      return ["fragment_arc", "meteor_lance"];
    case "heavenly_restriction":
      return ["killer_instinct", "bone_splitter"];
    case "striker":
    default:
      return ["severing_step", "cursed_output_spiral"];
  }
}

function getRewardItemId(classType, rewardSource) {
  if (rewardSource === "dungeon_miniboss") {
    switch (classType) {
      case "technique_fighter":
        return "echo_band";
      case "projection_sorcerer":
        return "prism_seal";
      case "heavenly_restriction":
        return "butcher_wrap";
      case "striker":
      default:
        return "siege_anklet";
    }
  }

  if (rewardSource === "veil_miniboss") {
    switch (classType) {
      case "technique_fighter":
        return "glass_veil_knot";
      case "projection_sorcerer":
        return "astral_prism";
      case "heavenly_restriction":
        return "gravebinder_strap";
      case "striker":
      default:
        return "cataclysm_locket";
    }
  }

  if (rewardSource === "cinder_miniboss") {
    switch (classType) {
      case "technique_fighter":
        return "ember_knot";
      case "projection_sorcerer":
        return "flare_prism";
      case "heavenly_restriction":
        return "ash_runner_wrap";
      case "striker":
      default:
        return "furnace_heart";
    }
  }

  if (rewardSource === "night_miniboss") {
    switch (classType) {
      case "technique_fighter":
        return "cathedral_knot";
      case "projection_sorcerer":
        return "moonwire_prism";
      case "heavenly_restriction":
        return "stalker_shroud";
      case "striker":
      default:
        return "night_iron_chain";
    }
  }

  if (rewardSource === "merger_miniboss") {
    switch (classType) {
      case "technique_fighter":
        return "star_script_knot";
      case "projection_sorcerer":
        return "orbit_prism";
      case "heavenly_restriction":
        return "grave_vector_wrap";
      case "striker":
      default:
        return "singularity_chain";
    }
  }

  if (rewardSource === "cinder_boss_core") {
    switch (classType) {
      case "technique_fighter":
        return "phoenix_loop";
      case "projection_sorcerer":
        return "sunflare_prism";
      case "heavenly_restriction":
        return "kiln_tread";
      case "striker":
      default:
        return "caldera_emblem";
    }
  }

  if (rewardSource === "merger_boss_core") {
    switch (classType) {
      case "technique_fighter":
        return "starfold_seal";
      case "projection_sorcerer":
        return "axis_crown";
      case "heavenly_restriction":
        return "eventide_harness";
      case "striker":
      default:
        return "merger_fang";
    }
  }

  return null;
}

function getRewardSkillId(classType, rewardSource) {
  if (rewardSource === "shatter_boss_scroll") {
    switch (classType) {
      case "technique_fighter":
        return "binding_thread_lance";
      case "projection_sorcerer":
        return "comet_array";
      case "heavenly_restriction":
        return "hunters_dive";
      case "striker":
      default:
        return "flash_sever";
    }
  }

  if (rewardSource === "veil_boss_scroll") {
    switch (classType) {
      case "technique_fighter":
        return "barrier_fracture";
      case "projection_sorcerer":
        return "vacuum_pulse";
      case "heavenly_restriction":
        return "execution_drive";
      case "striker":
      default:
        return "split_arc";
    }
  }

  if (rewardSource === "night_boss_scroll") {
    switch (classType) {
      case "technique_fighter":
        return "shadow_weave";
      case "projection_sorcerer":
        return "black_flash_cascade";
      case "heavenly_restriction":
        return "apex_instinct";
      case "striker":
      default:
        return "moon_sever";
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
      return ["midnight_tonic", "night_ichor", "domain_relic_shard"];
    case "merger_miniboss":
      return ["midnight_tonic", "merger_ink"];
    case "merger_boss_core":
      return ["star_amber", "merger_ink", "domain_relic_shard"];
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
    },
    {
      id: "craft_black_flash_talisman",
      resultItemId: "black_flash_talisman",
      ingredientIds: ["furnace_core", "night_ichor"]
    },
    {
      id: "craft_domain_amplification_charm",
      resultItemId: "domain_amplification_charm",
      ingredientIds: ["veil_shard", "domain_relic_shard"]
    }
  ];
}

function mapBossVaultToClearedRegion(regionId) {
  return regionId === "detention_center_boss_vault"
    ? "detention_center"
    : regionId === "barrier_shrine_boss_vault"
      ? "barrier_shrine"
      : regionId === "shibuya_burn_sector_boss_vault"
        ? "shibuya_burn_sector"
        : regionId === "collapsed_cathedral_barrier_boss_vault"
          ? "collapsed_cathedral_barrier"
          : regionId === "merger_ossuary_boss_vault"
            ? "merger_ossuary"
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
  "signatureActive",
  // Phase 2: JJK Mechanics
  "burnoutStacks",
  "blackFlashHitsRemaining",
  "lastCEUseTime",
  "domainActive",
  "antiDomainActive"
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
    regionId === "hub_jujutsu_high"
      ? ROUTE_STATE_KEYS
      : regionId.endsWith("_dungeon") || regionId.endsWith("_center") || regionId.endsWith("_shrine") || regionId.endsWith("_sector") || regionId.endsWith("_barrier") || regionId.endsWith("_ossuary")
        ? DUNGEON_AND_BOSS_STATE_KEYS
        : regionId.endsWith("_boss_vault")
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
    dungeon_miniboss: ["detention_center_dungeon"],
    veil_miniboss: ["barrier_shrine_dungeon"],
    cinder_miniboss: ["shibuya_burn_sector_dungeon"],
    night_miniboss: ["collapsed_cathedral_barrier_dungeon"],
    merger_miniboss: ["merger_ossuary_dungeon"],
    shatter_boss_scroll: ["detention_center_boss_vault"],
    veil_boss_scroll: ["barrier_shrine_boss_vault"],
    cinder_boss_core: ["shibuya_burn_sector_boss_vault"],
    night_boss_scroll: ["collapsed_cathedral_barrier_boss_vault"],
    merger_boss_core: ["merger_ossuary_boss_vault"]
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
    rewardSource === "night_miniboss" ||
    rewardSource === "merger_miniboss"
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
    rewardSource === "night_boss_scroll" ||
    rewardSource === "merger_boss_core"
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

  // Handle CE Output vs Reserve split from class base stats
  let baseCE = (baseStats.ceOutput ?? 0) + (baseStats.ceReserve ?? 0);
  let ceOutput = baseStats.ceOutput ?? baseStats.ce ?? 0;
  let ceReserve = baseStats.ceReserve ?? 0;

  for (const item of [...equippedItems, ...activeBuffItems]) {
    for (const [key, value] of Object.entries(item.statModifiers ?? {})) {
      if (key === "ceOutput") {
        ceOutput += value;
      } else if (key === "ceReserve") {
        ceReserve += value;
      } else if (key === "ce") {
        baseCE += value;
        ceOutput += value;
      } else {
        baseStats[key] = (baseStats[key] ?? 0) + value;
      }
    }
  }

  baseStats.attack = (baseStats.attack ?? 0) + (statAllocations.attack ?? 0) * 2;
  baseStats.defense = (baseStats.defense ?? 0) + (statAllocations.defense ?? 0);
  baseStats.hp = (baseStats.hp ?? 0) + (statAllocations.defense ?? 0) * 10;
  baseStats.speed = (baseStats.speed ?? 0) + (statAllocations.speed ?? 0);
  ceOutput += (statAllocations.attack ?? 0) * 4;
  ceReserve += (statAllocations.technique ?? 0) * 2;

  return {
    hp: baseStats.hp ?? 0,
    ce: ceOutput + ceReserve,
    ceOutput,
    ceReserve,
    attack: baseStats.attack ?? 0,
    defense: baseStats.defense ?? 0,
    speed: baseStats.speed ?? 0,
    technique: baseStats.technique ?? 0,
    perception: baseStats.perception ?? 0,
    crit: baseStats.crit ?? 0,
    poise: baseStats.poise ?? 0,
    blackFlashAffinity: classDefinition?.blackFlashAffinity ?? 1.0,
    burnoutThreshold: classDefinition?.burnoutThreshold ?? 3
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

function buildProfile(userId, classType = "striker") {
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
    currentRegionId: "hub_jujutsu_high",
    unlockedRegionIds: ["detention_center"],
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
    computedStats: computeStats(classType, equippedItemIds, statAllocations),
    // Phase 4: Grade progression fields
    sorcererGrade: "grade_4",
    gradePromotionProgress: 0,
    gradeKillLedger: {
      grade_4: 0,
      grade_3: 0,
      grade_2: 0,
      grade_1: 0,
      special_grade: 0
    },
    firstGradeTrialClears: [],
    specialGradeCandidate: false,
    specialGradeSightings: [],
    specialGradeKills: [],
    // Phase 4B: Technique mastery fields
    techniqueMasteryRank: "novice",
    techniqueMasteryProgress: 0,
    techniqueUsageCount: {},
    bossKillCount: 0,
    blackFlashChainCount: 0,
    domainClashCount: 0
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
    unlockedRegionIds: profile.unlockedRegionIds ?? ["detention_center"],
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
      ...(profile.unlockedRegionIds ?? ["detention_center"]),
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
    // Phase 4: Handle boss kill tracking
    if (sessionState.bossKillCount) {
      profile.bossKillCount = (profile.bossKillCount ?? 0) + sessionState.bossKillCount;
    }
    // Phase 4: Track special grade kills
    if (sessionState.bossId && (sessionState.bossId.includes("special_grade") ||
        sessionState.bossId.includes("smallpox") || sessionState.bossId.includes("hunger") ||
        sessionState.bossId.includes("bell"))) {
      profile.specialGradeKills = profile.specialGradeKills ?? [];
      if (!profile.specialGradeKills.includes(sessionState.bossId)) {
        profile.specialGradeKills.push(sessionState.bossId);
      }
    }
    // Phase 4: Merge technique usage count
    if (sessionState.techniqueUsageCount) {
      profile.techniqueUsageCount = {
        ...(profile.techniqueUsageCount ?? {}),
        ...sessionState.techniqueUsageCount
      };
      // Recalculate technique mastery progress
      const totalUses = Object.values(profile.techniqueUsageCount).reduce((a, b) => a + b, 0);
      const bossKills = profile.bossKillCount ?? 0;
      const newProgress = Math.min(100, (profile.techniqueMasteryProgress ?? 0) + 0.5 + (bossKills * 2));
      profile.techniqueMasteryProgress = newProgress;
      // Check for rank up
      if (newProgress >= 25 && profile.techniqueMasteryRank === "novice") {
        profile.techniqueMasteryRank = "refined";
      } else if (newProgress >= 50 && profile.techniqueMasteryRank === "refined") {
        profile.techniqueMasteryRank = "advanced";
      } else if (newProgress >= 75 && profile.techniqueMasteryRank === "advanced") {
        profile.techniqueMasteryRank = "grade_1_caliber";
      } else if (newProgress >= 100 && profile.techniqueMasteryRank === "grade_1_caliber") {
        profile.techniqueMasteryRank = "special_grade_caliber";
      }
    }
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
