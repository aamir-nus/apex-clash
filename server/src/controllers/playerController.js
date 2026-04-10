import { logger } from "../lib/logger.js";
import {
  applyPlayerCombatReward,
  applyPlayerProgressionChoice,
  craftPlayerInventoryItem,
  claimPlayerReward,
  equipPlayerItem,
  equipPlayerSkills,
  getOrCreatePlayerProfile,
  setPlayerClassType,
  usePlayerConsumable,
  updatePlayerSessionState
} from "../services/playerProfileService.js";
import {
  checkPromotionEligibility,
  getCurrentGrade,
  getNextPromotionRule,
  getGradeDisplayInfo,
  promoteToNextGrade,
  recordGradeKill,
  recordTechniqueUsage
} from "../services/gradePromotionService.js";
import {
  getAllAnomalySectors,
  checkAnomalySectorEligibility,
  getAllFirstGradeTrials,
  getAvailableTrials,
  completeTrial,
  checkAscensionEligibility,
  completeAscension,
  getEndgameStatus
} from "../services/endgameService.js";

function requireAuth(request, response) {
  if (!request.authUser) {
    response.status(401).json({ ok: false, error: "Not authenticated" });
    return false;
  }

  return true;
}

export async function getPlayerProfile(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  response.json({
    ok: true,
    data: await getOrCreatePlayerProfile(request.authUser.id)
  });
}

export async function updatePlayerClass(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await setPlayerClassType(request.authUser.id, request.body?.classType);
  if (result.error) {
    logger.warn("Rejected player class update", {
      requestId: request.id,
      classType: request.body?.classType,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function equipPlayerInventoryItem(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await equipPlayerItem(request.authUser.id, request.body?.itemId);
  if (result.error) {
    logger.warn("Rejected inventory equip", {
      requestId: request.id,
      itemId: request.body?.itemId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function equipPlayerLoadoutSkills(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await equipPlayerSkills(request.authUser.id, request.body?.skillIds ?? []);
  if (result.error) {
    logger.warn("Rejected skill equip", {
      requestId: request.id,
      skillIds: request.body?.skillIds,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function usePlayerInventoryConsumable(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await usePlayerConsumable(request.authUser.id, request.body?.itemId);
  if (result.error) {
    logger.warn("Rejected consumable use", {
      requestId: request.id,
      itemId: request.body?.itemId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result });
}

export async function craftPlayerInventoryReward(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await craftPlayerInventoryItem(request.authUser.id, request.body?.recipeId);
  if (result.error) {
    logger.warn("Rejected item craft", {
      requestId: request.id,
      recipeId: request.body?.recipeId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result });
}

export async function applyPlayerLevelChoice(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await applyPlayerProgressionChoice(
    request.authUser.id,
    request.body?.optionId,
    request.body?.runtimeState ?? {}
  );

  if (result.error) {
    logger.warn("Rejected progression choice", {
      requestId: request.id,
      optionId: request.body?.optionId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function applyPlayerCombatProgression(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const rewardState = request.body ?? {};

  // Validate progression reward bounds to prevent exploits
  if (rewardState.xpGained !== undefined) {
    const MAX_XP_PER_SESSION = 10000; // Reasonable upper bound
    if (
      typeof rewardState.xpGained !== "number" ||
      rewardState.xpGained < 0 ||
      rewardState.xpGained > MAX_XP_PER_SESSION
    ) {
      response.status(400).json({ ok: false, error: "Invalid XP gain" });
      return;
    }
  }

  if (rewardState.level !== undefined) {
    if (
      typeof rewardState.level !== "number" ||
      rewardState.level < 1 ||
      rewardState.level > 100
    ) {
      response.status(400).json({ ok: false, error: "Invalid level" });
      return;
    }
  }

  if (rewardState.pendingStatPoints !== undefined) {
    if (
      typeof rewardState.pendingStatPoints !== "number" ||
      rewardState.pendingStatPoints < 0 ||
      rewardState.pendingStatPoints > 50
    ) {
      response.status(400).json({ ok: false, error: "Invalid stat points" });
      return;
    }
  }

  const result = await applyPlayerCombatReward(request.authUser.id, rewardState);
  response.json({ ok: true, data: result.profile });
}

export async function updatePlayerSession(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const sessionState = request.body ?? {};

  // Validate session state values
  if (sessionState.level !== undefined) {
    if (
      typeof sessionState.level !== "number" ||
      sessionState.level < 1 ||
      sessionState.level > 100
    ) {
      response.status(400).json({ ok: false, error: "Invalid level" });
      return;
    }
  }

  if (sessionState.xp !== undefined) {
    if (
      typeof sessionState.xp !== "number" ||
      sessionState.xp < 0 ||
      sessionState.xp > 100000
    ) {
      response.status(400).json({ ok: false, error: "Invalid XP value" });
      return;
    }
  }

  if (sessionState.bossKillCount !== undefined) {
    if (
      typeof sessionState.bossKillCount !== "number" ||
      sessionState.bossKillCount < 0 ||
      sessionState.bossKillCount > 1000
    ) {
      response.status(400).json({ ok: false, error: "Invalid boss kill count" });
      return;
    }
  }

  const result = await updatePlayerSessionState(request.authUser.id, sessionState);
  response.json({ ok: true, data: result.profile });
}

export async function claimPlayerDungeonReward(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await claimPlayerReward(
    request.authUser.id,
    request.body?.rewardSource,
    request.body?.regionId,
    request.body?.sessionState ?? null
  );
  if (result.error) {
    logger.warn("Rejected reward claim", {
      requestId: request.id,
      rewardSource: request.body?.rewardSource,
      regionId: request.body?.regionId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result });
}

// Phase 4: Grade promotion endpoints

export async function getGradePromotionStatus(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const currentGrade = getCurrentGrade(profile);
  const eligibility = checkPromotionEligibility(profile);
  const nextGrade = getNextPromotionRule(profile);

  response.json({
    ok: true,
    data: {
      currentGrade: getGradeDisplayInfo(currentGrade),
      nextGrade: nextGrade ? getGradeDisplayInfo(nextGrade.id) : null,
      eligible: eligibility.eligible,
      issues: eligibility.issues,
      gradeKillLedger: profile.gradeKillLedger ?? {},
      techniqueMasteryRank: profile.techniqueMasteryRank ?? "novice",
      techniqueMasteryProgress: profile.techniqueMasteryProgress ?? 0
    }
  });
}

export async function promotePlayerGrade(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const result = promoteToNextGrade(profile);

  if (!result.success) {
    logger.warn("Rejected grade promotion", {
      requestId: request.id,
      userId: request.authUser.id,
      currentGrade: result.previousGrade,
      issues: result.issues
    });
    response.status(400).json({
      ok: false,
      error: "Not eligible for promotion",
      issues: result.issues
    });
    return;
  }

  // Update the profile with the new grade
  const updatedProfile = await setPlayerClassType(request.authUser.id, profile.classType);
  if (updatedProfile.error) {
    response.status(500).json({ ok: false, error: "Failed to update profile" });
    return;
  }

  // Merge the grade promotion changes
  updatedProfile.profile.sorcererGrade = result.newGrade;
  updatedProfile.profile.gradePromotionProgress = 0;
  if (result.newGrade === "special_grade_candidate") {
    updatedProfile.profile.specialGradeCandidate = true;
  }

  logger.info("Player grade promoted", {
    requestId: request.id,
    userId: request.authUser.id,
    previousGrade: result.previousGrade,
    newGrade: result.newGrade,
    unlocks: result.unlocks
  });

  response.json({
    ok: true,
    data: {
      profile: updatedProfile.profile,
      previousGrade: result.previousGrade,
      newGrade: result.newGrade,
      newGradeDisplay: getGradeDisplayInfo(result.newGrade),
      unlocks: result.unlocks
    }
  });
}

export async function recordCombatGradeData(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const { enemyGrade, enemyId, skillId, isBossKill, blackFlashChainLength } = request.body ?? {};

  // This endpoint is called by combat scenes to record grade progression data
  // The actual progression update happens through updatePlayerSession
  let sessionUpdate = {};

  if (enemyGrade !== undefined) {
    sessionUpdate.gradeKillLedger = recordGradeKill(
      await getOrCreatePlayerProfile(request.authUser.id),
      enemyGrade,
      enemyId
    );
  }

  if (skillId) {
    sessionUpdate.techniqueUsageCount = recordTechniqueUsage(
      await getOrCreatePlayerProfile(request.authUser.id),
      skillId
    );
  }

  if (isBossKill) {
    sessionUpdate.bossKillCount = ((await getOrCreatePlayerProfile(request.authUser.id)).bossKillCount ?? 0) + 1;
  }

  if (blackFlashChainLength && blackFlashChainLength >= 2) {
    sessionUpdate.blackFlashChainCount = ((await getOrCreatePlayerProfile(request.authUser.id)).blackFlashChainCount ?? 0) + 1;
  }

  if (Object.keys(sessionUpdate).length > 0) {
    const result = await updatePlayerSessionState(request.authUser.id, sessionUpdate);
    response.json({ ok: true, data: result.profile });
  } else {
    response.json({ ok: true, data: await getOrCreatePlayerProfile(request.authUser.id) });
  }
}

// Phase 5: Endgame endpoints

export async function getEndgameStatusEndpoint(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const status = getEndgameStatus(profile);

  response.json({
    ok: true,
    data: status
  });
}

export async function getAnomalySectors(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const allSectors = getAllAnomalySectors();

  const sectorsWithEligibility = allSectors.map((sector) => ({
    ...sector,
    eligibility: checkAnomalySectorEligibility(profile, sector.id)
  }));

  response.json({
    ok: true,
    data: sectorsWithEligibility
  });
}

export async function getFirstGradeTrials(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const availableTrials = getAvailableTrials(profile);

  response.json({
    ok: true,
    data: availableTrials
  });
}

export async function completeFirstGradeTrial(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const { trialId, trialData } = request.body ?? {};

  if (!trialId) {
    response.status(400).json({ ok: false, error: "trialId is required" });
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const result = completeTrial(profile, trialId, trialData);

  if (result.error) {
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  // Update profile with trial completion
  await updatePlayerSessionState(request.authUser.id, {
    firstGradeTrialClears: result.updatedProfile.firstGradeTrialClears
  });

  logger.info("First-grade trial completed", {
    requestId: request.id,
    userId: request.authUser.id,
    trialId,
    isNewComplete: result.isNewComplete
  });

  response.json({
    ok: true,
    data: {
      ...result.rewards,
      isNewComplete: result.isNewComplete
    }
  });
}

export async function getAscensionStatus(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const eligibility = checkAscensionEligibility(profile);

  response.json({
    ok: true,
    data: {
      eligible: eligibility.eligible,
      issues: eligibility.issues,
      encounter: eligibility.encounter
    }
  });
}

export async function completeAscensionEncounter(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const { encounterId } = request.body ?? {};

  const profile = await getOrCreatePlayerProfile(request.authUser.id);
  const result = completeAscension(profile, encounterId);

  if (!result.success) {
    logger.warn("Ascension completion rejected", {
      requestId: request.id,
      userId: request.authUser.id,
      error: result.error,
      issues: result.issues
    });
    response.status(400).json({
      ok: false,
      error: result.error ?? "Not eligible for ascension",
      issues: result.issues
    });
    return;
  }

  // Update profile with S-Class status
  await updatePlayerSessionState(request.authUser.id, {
    sorcererGrade: result.newGrade,
    ascensionComplete: true,
    unlockedFeatures: result.updatedProfile.unlockedFeatures
  });

  logger.info("Player completed ascension to S-Class", {
    requestId: request.id,
    userId: request.authUser.id,
    previousGrade: result.previousGrade,
    newGrade: result.newGrade
  });

  response.json({
    ok: true,
    data: {
      previousGrade: result.previousGrade,
      newGrade: result.newGrade,
      newGradeDisplay: getGradeDisplayInfo(result.newGrade),
      rewards: result.rewards
    }
  });
}
