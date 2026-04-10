import { getBootstrapContent } from "./contentService.js";

let promotionRules = null;
let techniqueMasteryRanks = null;

function loadContent() {
  const content = getBootstrapContent();
  if (!promotionRules) {
    promotionRules = new Map(
      content.promotionRules?.map((rule) => [rule.id, rule]) ?? []
    );
  }
  if (!techniqueMasteryRanks) {
    techniqueMasteryRanks = new Map(
      content.techniqueMastery?.map((rank) => [rank.id, rank]) ?? []
    );
  }
}

/**
 * Get the promotion rule for a given grade ID
 */
export function getPromotionRule(gradeId) {
  loadContent();
  return promotionRules.get(gradeId);
}

/**
 * Get the current sorcerer grade for a profile
 */
export function getCurrentGrade(profile) {
  return profile.sorcererGrade ?? "grade_4";
}

/**
 * Get the next promotion rule for a profile
 */
export function getNextPromotionRule(profile) {
  const currentRule = getPromotionRule(getCurrentGrade(profile));
  return currentRule?.promotionRequirements?.nextGrade
    ? getPromotionRule(currentRule.promotionRequirements.nextGrade)
    : null;
}

/**
 * Calculate XP multiplier based on enemy grade vs player grade
 */
export function getXPMultiplier(profile, enemyGrade) {
  loadContent();
  const playerGrade = getCurrentGrade(profile);
  const playerRule = getPromotionRule(playerGrade);

  if (!playerRule || !enemyGrade) {
    return 1.0;
  }

  const playerRank = playerRule.rank;
  const enemyRule = getPromotionRule(enemyGrade);

  if (!enemyRule) {
    return 1.0;
  }

  const enemyRank = enemyRule.rank;
  // Grade difference: negative means enemy is higher grade (better), positive means enemy is lower grade
  const gradeDiff = playerRank - enemyRank;

  const multipliers = playerRule.xpMultipliers;

  if (gradeDiff === 0) {
    return multipliers?.sameGrade ?? 1.0;
  } else if (gradeDiff === 1) {
    // Enemy is one grade above player (e.g., player grade 4 vs enemy grade 3)
    return multipliers?.oneGradeAbove ?? 1.5;
  } else if (gradeDiff >= 2) {
    // Enemy is two+ grades above player (e.g., player grade 4 vs enemy grade 2)
    return multipliers?.twoGradesAbove ?? 2.2;
  } else {
    // Enemy is lower grade than player (negative gradeDiff)
    return multipliers?.lowerGrade ?? 0.7;
  }
}

/**
 * Record a kill in the grade kill ledger
 */
export function recordGradeKill(profile, enemyGrade, enemyId) {
  const ledger = profile.gradeKillLedger ?? {};

  // Initialize grade buckets if they don't exist
  if (!ledger.grade_4) ledger.grade_4 = 0;
  if (!ledger.grade_3) ledger.grade_3 = 0;
  if (!ledger.grade_2) ledger.grade_2 = 0;
  if (!ledger.grade_1) ledger.grade_1 = 0;
  if (!ledger.special_grade) ledger.special_grade = 0;

  // Track unique kills per grade
  const gradeKey = enemyGrade ?? "grade_4";
  if (!ledger[`${gradeKey}_unique`]) {
    ledger[`${gradeKey}_unique`] = [];
  }

  ledger[gradeKey] = (ledger[gradeKey] || 0) + 1;

  // Track unique enemies
  if (enemyId && !ledger[`${gradeKey}_unique`].includes(enemyId)) {
    ledger[`${gradeKey}_unique`].push(enemyId);
  }

  return ledger;
}

/**
 * Check if profile meets promotion requirements for next grade
 */
export function checkPromotionEligibility(profile) {
  const currentGrade = getCurrentGrade(profile);
  const currentRule = getPromotionRule(currentGrade);

  if (!currentRule?.promotionRequirements) {
    return { eligible: false, reason: "Max grade reached" };
  }

  const reqs = currentRule.promotionRequirements;
  const ledger = profile.gradeKillLedger ?? {};
  const issues = [];

  // Check level requirement
  if (reqs.levelRequired && profile.level < reqs.levelRequired) {
    issues.push(`Level ${reqs.levelRequired} required (current: ${profile.level})`);
  }

  // Check kill requirements based on target grade
  if (reqs.nextGrade === "grade_3") {
    const grade3Kills = ledger.grade_3 ?? 0;
    const grade3BossClears = profile.clearedRegionIds?.filter((id) =>
      id.includes("detention_center")
    ).length ?? 0;

    if (grade3Kills < (reqs.grade3KillsRequired ?? 0)) {
      issues.push(`${reqs.grade3KillsRequired} Grade 3 kills required (current: ${grade3Kills})`);
    }
    if (grade3BossClears < (reqs.grade3BossRequired ?? 0)) {
      issues.push(`${reqs.grade3BossRequired} Grade 3 boss clear required (current: ${grade3BossClears})`);
    }
  }

  if (reqs.nextGrade === "grade_2") {
    const grade2Kills = ledger.grade_2 ?? 0;
    if (grade2Kills < (reqs.grade2KillsRequired ?? 0)) {
      issues.push(`${reqs.grade2KillsRequired} Grade 2 kills required (current: ${grade2Kills})`);
    }
    if (reqs.regionClearRequired && !profile.clearedRegionIds?.includes(reqs.regionClearRequired)) {
      issues.push(`Region clear required: ${reqs.regionClearRequired}`);
    }
  }

  if (reqs.nextGrade === "grade_1") {
    const grade1UniqueKills = (ledger.grade_1_unique ?? []).length;
    const grade1TotalKills = ledger.grade_1 ?? 0;

    if (grade1UniqueKills < (reqs.grade1UniqueKillsRequired ?? 0)) {
      issues.push(`${reqs.grade1UniqueKillsRequired} unique Grade 1 kills required (current: ${grade1UniqueKills})`);
    }
    if (grade1TotalKills < (reqs.grade1TotalKillsRequired ?? 0)) {
      issues.push(`${reqs.grade1TotalKillsRequired} total Grade 1 kills required (current: ${grade1TotalKills})`);
    }
    if (reqs.grade1TrialRequired && !profile.firstGradeTrialClears?.length) {
      issues.push(`Grade 1 trial clear required`);
    }
  }

  if (reqs.nextGrade === "special_grade_candidate") {
    const trialClearCount = profile.firstGradeTrialClears?.length ?? 0;
    const totalTrials = 10; // Assumed total trials
    const clearRate = trialClearCount / totalTrials;

    if (clearRate < (reqs.firstGradeTrialClearRate ?? 0.9)) {
      issues.push(`${Math.ceil((reqs.firstGradeTrialClearRate ?? 0.9) * totalTrials)} Grade 1 trial clears required (current: ${trialClearCount})`);
    }
    if ((reqs.specialGradeDefeatRequired ?? 0) > profile.specialGradeKills?.length) {
      issues.push(`${reqs.specialGradeDefeatRequired} special grade defeat required (current: ${profile.specialGradeKills?.length ?? 0})`);
    }
    if (reqs.techniqueMasteryRequired) {
      const masteryRank = getTechniqueMasteryRank(profile);
      if (masteryRank?.id !== reqs.techniqueMasteryRequired) {
        issues.push(`Technique mastery rank required: ${reqs.techniqueMasteryRequired}`);
      }
    }
  }

  if (reqs.nextGrade === "special_grade") {
    if ((reqs.specialGradeKillsRequired ?? 0) > profile.specialGradeKills?.length) {
      issues.push(`${reqs.specialGradeKillsRequired} special grade kills required (current: ${profile.specialGradeKills?.length ?? 0})`);
    }
    if (reqs.ascensionEncounterRequired) {
      // Check for ascension flag in session state
      if (!profile.sessionState?.ascensionComplete) {
        issues.push(`Ascension encounter required`);
      }
    }
    if (reqs.techniqueMasteryRequired) {
      const masteryRank = getTechniqueMasteryRank(profile);
      if (masteryRank?.id !== reqs.techniqueMasteryRequired) {
        issues.push(`Technique mastery rank required: ${reqs.techniqueMasteryRequired}`);
      }
    }
  }

  return {
    eligible: issues.length === 0,
    issues,
    currentGrade,
    nextGrade: reqs.nextGrade,
    requirements: reqs
  };
}

/**
 * Promote a profile to the next grade
 */
export function promoteToNextGrade(profile) {
  const eligibility = checkPromotionEligibility(profile);

  if (!eligibility.eligible) {
    return {
      success: false,
      profile,
      issues: eligibility.issues
    };
  }

  const newGrade = eligibility.nextGrade;
  const updatedProfile = {
    ...profile,
    sorcererGrade: newGrade,
    gradePromotionProgress: 0
  };

  // Special grade candidate flag
  if (newGrade === "special_grade_candidate") {
    updatedProfile.specialGradeCandidate = true;
  }

  return {
    success: true,
    profile: updatedProfile,
    previousGrade: eligibility.currentGrade,
    newGrade,
    unlocks: getPromotionRule(newGrade)?.unlocks ?? []
  };
}

/**
 * Get technique mastery rank for a profile
 */
export function getTechniqueMasteryRank(profile) {
  loadContent();
  const rankId = profile.techniqueMasteryRank ?? "novice";
  return techniqueMasteryRanks.get(rankId);
}

/**
 * Calculate technique mastery progress
 */
export function calculateTechniqueMasteryProgress(profile) {
  const progress = profile.techniqueMasteryProgress ?? 0;
  const currentRank = getTechniqueMasteryRank(profile);

  if (!currentRank) {
    return { rank: null, progress: 0, nextRank: null, progressToNext: 0 };
  }

  const nextRankId = getTechniqueMasteryRankIdByRank((currentRank.rank ?? 0) + 1);
  const nextRank = nextRankId ? techniqueMasteryRanks.get(nextRankId) : null;

  return {
    rank: currentRank,
    progress,
    nextRank,
    progressToNext: nextRank ? Math.min(100, progress) : 100
  };
}

function getTechniqueMasteryRankIdByRank(rank) {
  loadContent();
  for (const [id, data] of techniqueMasteryRanks) {
    if (data.rank === rank) {
      return id;
    }
  }
  return null;
}

/**
 * Record technique usage and gain mastery progress
 */
export function recordTechniqueUsage(profile, skillId) {
  const usageCount = profile.techniqueUsageCount ?? {};
  usageCount[skillId] = (usageCount[skillId] || 0) + 1;

  const totalUses = Object.values(usageCount).reduce((a, b) => a + b, 0);
  const bossKills = profile.bossKillCount ?? 0;
  const blackFlashChains = profile.blackFlashChainCount ?? 0;
  const domainClashes = profile.domainClashCount ?? 0;

  // Mastery progress formula
  const progressGain = 0.5 + (bossKills * 2) + (blackFlashChains * 5) + (domainClashes * 3);
  const newProgress = Math.min(100, (profile.techniqueMasteryProgress ?? 0) + progressGain);

  const updatedProfile = {
    ...profile,
    techniqueUsageCount: usageCount,
    techniqueMasteryProgress: newProgress
  };

  // Check for rank up
  const currentRank = getTechniqueMasteryRank(profile);
  if (currentRank && newProgress >= (currentRank.unlockThreshold ?? 100)) {
    const nextRankId = getTechniqueMasteryRankIdByRank((currentRank.rank ?? 0) + 1);
    if (nextRankId) {
      updatedProfile.techniqueMasteryRank = nextRankId;
      updatedProfile.techniqueMasteryRank = nextRankId;
    }
  }

  return updatedProfile;
}

/**
 * Get grade display info for UI
 */
export function getGradeDisplayInfo(gradeId) {
  const rule = getPromotionRule(gradeId);
  if (!rule) {
    return { name: "Unknown", rank: 4, color: "#888" };
  }

  const colors = {
    special_grade: "#FFD700",
    special_grade_candidate: "#C0C0C0",
    grade_1: "#FF6B6B",
    grade_2: "#4ECDC4",
    grade_3: "#45B7D1",
    grade_4: "#96CEB4"
  };

  return {
    id: rule.id,
    name: rule.name,
    rank: rule.rank,
    description: rule.description,
    color: colors[rule.id] ?? "#888",
    unlocks: rule.unlocks ?? []
  };
}
