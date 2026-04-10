import { getBootstrapContent } from "./contentService.js";
import { checkPromotionEligibility } from "./gradePromotionService.js";

let anomalySectors = null;
let firstGradeTrials = null;
let ascensionEncounters = null;

function loadContent() {
  const content = getBootstrapContent();
  if (!anomalySectors) {
    anomalySectors = new Map(
      content.anomalySectors?.map((sector) => [sector.id, sector]) ?? []
    );
  }
  if (!firstGradeTrials) {
    firstGradeTrials = new Map(
      content.firstGradeTrials?.map((trial) => [trial.id, trial]) ?? []
    );
  }
  if (!ascensionEncounters) {
    ascensionEncounters = new Map(
      content.ascensionEncounter?.map((encounter) => [encounter.id, encounter]) ?? []
    );
  }
}

/**
 * Get anomaly sector by ID
 */
export function getAnomalySector(sectorId) {
  loadContent();
  return anomalySectors.get(sectorId);
}

/**
 * Get all anomaly sectors
 */
export function getAllAnomalySectors() {
  loadContent();
  return Array.from(anomalySectors.values());
}

/**
 * Check if player can access an anomaly sector
 */
export function checkAnomalySectorEligibility(profile, sectorId) {
  loadContent();
  const sector = getAnomalySector(sectorId);

  if (!sector) {
    return { eligible: false, reason: "Anomaly sector not found" };
  }

  const reqs = sector.unlockRequirements ?? {};
  const issues = [];

  // Check grade requirement
  if (reqs.minGrade) {
    const gradeRank = {
      special_grade: -1,
      special_grade_candidate: 0,
      grade_1: 1,
      grade_2: 2,
      grade_3: 3,
      grade_4: 4
    };
    const minRank = gradeRank[reqs.minGrade] ?? 4;
    const playerRank = gradeRank[profile.sorcererGrade ?? "grade_4"] ?? 4;

    if (playerRank > minRank) {
      issues.push(`Requires ${reqs.minGrade.replace(/_/g, " ")}`);
    }
  }

  // Check level requirement
  if (reqs.minLevel && (profile.level ?? 1) < reqs.minLevel) {
    issues.push(`Requires level ${reqs.minLevel}`);
  }

  // Check special grade kills
  if (reqs.specialGradeKillsRequired) {
    const killCount = profile.specialGradeKills?.length ?? 0;
    if (killCount < reqs.specialGradeKillsRequired) {
      issues.push(`Requires ${reqs.specialGradeKillsRequired} special grade kills (current: ${killCount})`);
    }
  }

  // Check cleared regions
  if (reqs.clearedRegionsRequired) {
    const clearedCount = reqs.clearedRegionsRequired.filter((region) =>
      profile.clearedRegionIds?.includes(region)
    ).length;
    if (clearedCount < reqs.clearedRegionsRequired.length) {
      issues.push(`Requires clearing: ${reqs.clearedRegionsRequired.join(", ")}`);
    }
  }

  // Check boss kill count
  if (reqs.bossKillCountRequired) {
    const bossCount = profile.bossKillCount ?? 0;
    if (bossCount < reqs.bossKillCountRequired) {
      issues.push(`Requires ${reqs.bossKillCountRequired} boss kills (current: ${bossCount})`);
    }
  }

  return {
    eligible: issues.length === 0,
    issues,
    sector
  };
}

/**
 * Get first-grade trial by ID
 */
export function getFirstGradeTrial(trialId) {
  loadContent();
  return firstGradeTrials.get(trialId);
}

/**
 * Get all first-grade trials
 */
export function getAllFirstGradeTrials() {
  loadContent();
  return Array.from(firstGradeTrials.values());
}

/**
 * Get available trials for a player
 */
export function getAvailableTrials(profile) {
  loadContent();
  const allTrials = getAllFirstGradeTrials();
  const completedTrials = profile.firstGradeTrialClears ?? [];

  return allTrials
    .filter((trial) => {
      const reqs = trial.unlockRequirements ?? {};

      // Check grade
      if (reqs.minGrade) {
        const gradeRank = {
          special_grade: -1,
          special_grade_candidate: 0,
          grade_1: 1,
          grade_2: 2,
          grade_3: 3,
          grade_4: 4
        };
        const minRank = gradeRank[reqs.minGrade] ?? 4;
        const playerRank = gradeRank[profile.sorcererGrade ?? "grade_4"] ?? 4;
        if (playerRank > minRank) return false;
      }

      // Check level
      if (reqs.minLevel && (profile.level ?? 1) < reqs.minLevel) {
        return false;
      }

      // Check black flash chain
      if (reqs.blackFlashChainRequired) {
        if ((profile.blackFlashChainCount ?? 0) < reqs.blackFlashChainRequired) {
          return false;
        }
      }

      // Check skill requirement
      if (reqs.simpleDomainSkillRequired) {
        const hasSkill = profile.equippedSkills?.some((skill) =>
          skill.tags?.includes("anti_domain")
        );
        if (!hasSkill) return false;
      }

      // Check technique usage
      if (reqs.techniqueUsageCountRequired) {
        const totalUses = Object.values(profile.techniqueUsageCount ?? {}).reduce((a, b) => a + b, 0);
        if (totalUses < reqs.techniqueUsageCountRequired) return false;
      }

      // Check trial completion prerequisite
      if (reqs.firstGradeTrialClearsRequired) {
        if (completedTrials.length < reqs.firstGradeTrialClearsRequired) return false;
      }

      // Check special grade kills
      if (reqs.specialGradeKillsRequired) {
        if ((profile.specialGradeKills?.length ?? 0) < reqs.specialGradeKillsRequired) {
          return false;
        }
      }

      // Check all trials complete requirement
      if (reqs.allFirstGradeTrialsComplete) {
        const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
        if (completedTrials.length < totalTrials) return false;
      }

      return true;
    })
    .map((trial) => ({
      ...trial,
      isCompleted: completedTrials.includes(trial.id),
      canRetry: !completedTrials.includes(trial.id)
    }));
}

/**
 * Complete a trial and return rewards
 */
export function completeTrial(profile, trialId, trialData = {}) {
  loadContent();
  const trial = getFirstGradeTrial(trialId);

  if (!trial) {
    return { error: "Trial not found" };
  }

  // Track trial completion
  const completedTrials = profile.firstGradeTrialClears ?? [];
  const isNewComplete = !completedTrials.includes(trialId);

  if (isNewComplete) {
    completedTrials.push(trialId);
  }

  // Calculate rewards
  const rewards = trial.rewards ?? {};
  const xpBonus = rewards.xpBonus ?? 0;
  const items = rewards.items ?? [];
  const unlocks = rewards.unlocks ?? [];
  const techniqueMasteryBonus = rewards.techniqueMasteryBonus ?? 0;
  const statBoosts = rewards.statBoosts ?? {};

  return {
    success: true,
    isNewComplete,
    rewards: {
      xpBonus,
      items,
      unlocks,
      techniqueMasteryBonus,
      statBoosts
    },
    updatedProfile: {
      ...profile,
      firstGradeTrialClears: completedTrials
    }
  };
}

/**
 * Get ascension encounter
 */
export function getAscensionEncounter(encounterId = "ascension_trial") {
  loadContent();
  return ascensionEncounters.get(encounterId);
}

/**
 * Check ascension eligibility
 */
export function checkAscensionEligibility(profile) {
  loadContent();
  const encounter = getAscensionEncounter();

  if (!encounter) {
    return { eligible: false, reason: "Ascension encounter not found" };
  }

  const reqs = encounter.unlockRequirements ?? {};
  const issues = [];

  // Check grade
  if (reqs.minGrade && profile.sorcererGrade !== reqs.minGrade) {
    issues.push(`Requires ${reqs.minGrade.replace(/_/g, " ")}`);
  }

  // Check level
  if (reqs.minLevel && (profile.level ?? 1) < reqs.minLevel) {
    issues.push(`Requires level ${reqs.minLevel}`);
  }

  // Check special grade kills
  if (reqs.specialGradeKillsRequired) {
    const killCount = profile.specialGradeKills?.length ?? 0;
    if (killCount < reqs.specialGradeKillsRequired) {
      issues.push(`Requires ${reqs.specialGradeKillsRequired} special grade kills (current: ${killCount})`);
    }
  }

  // Check technique mastery
  if (reqs.techniqueMasteryRequired) {
    if (profile.techniqueMasteryRank !== reqs.techniqueMasteryRequired) {
      issues.push(`Requires technique mastery: ${reqs.techniqueMasteryRequired.replace(/_/g, " ")}`);
    }
  }

  // Check trial completion
  if (reqs.allFirstGradeTrialsRequired) {
    const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
    const completedCount = profile.firstGradeTrialClears?.length ?? 0;
    if (completedCount < totalTrials) {
      issues.push(`Requires completing all first-grade trials (${completedCount}/${totalTrials})`);
    }
  }

  // Check for required item
  if (reqs.requiredItemId) {
    const hasItem = profile.inventoryItems?.some((item) => item.id === reqs.requiredItemId);
    if (!hasItem) {
      issues.push(`Requires item: ${reqs.requiredItemId}`);
    }
  }

  return {
    eligible: issues.length === 0,
    issues,
    encounter
  };
}

/**
 * Complete ascension and promote to Special Grade
 */
export function completeAscension(profile, encounterId = "ascension_trial") {
  loadContent();
  const eligibility = checkAscensionEligibility(profile);

  if (!eligibility.eligible) {
    return {
      success: false,
      error: "Not eligible for ascension",
      issues: eligibility.issues
    };
  }

  const encounter = eligibility.encounter;
  const rewards = encounter.rewards ?? {};

  // Update profile with S-Class status
  const updatedProfile = {
    ...profile,
    sorcererGrade: rewards.promotionGrade ?? "special_grade",
    ascensionComplete: true,
    unlockedFeatures: [
      ...(profile.unlockedFeatures ?? []),
      ...(rewards.unlocks ?? [])
    ]
  };

  return {
    success: true,
    previousGrade: profile.sorcererGrade,
    newGrade: rewards.promotionGrade ?? "special_grade",
    rewards: {
      xpBonus: rewards.xpBonus ?? 0,
      items: rewards.items ?? [],
      unlocks: rewards.unlocks ?? [],
      techniqueMasteryBonus: rewards.techniqueMasteryBonus ?? 0,
      statBoosts: rewards.statBoosts ?? {}
    },
    updatedProfile
  };
}

/**
 * Get endgame status for UI
 */
export function getEndgameStatus(profile) {
  loadContent();

  const completedTrials = profile.firstGradeTrialClears ?? [];
  const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
  const trialCompletionRate = completedTrials.length / totalTrials;

  const specialGradeKills = profile.specialGradeKills?.length ?? 0;
  const bossKillCount = profile.bossKillCount ?? 0;

  const ascensionEligibility = checkAscensionEligibility(profile);

  return {
    grade: profile.sorcererGrade ?? "grade_4",
    level: profile.level ?? 1,
    trialCompletion: {
      completed: completedTrials,
      total: totalTrials,
      rate: trialCompletionRate
    },
    specialGradeKills,
    bossKillCount,
    techniqueMasteryRank: profile.techniqueMasteryRank ?? "novice",
    techniqueMasteryProgress: profile.techniqueMasteryProgress ?? 0,
    ascensionComplete: profile.ascensionComplete ?? false,
    ascensionEligible: ascensionEligibility.eligible,
    ascensionIssues: ascensionEligibility.issues,
    unlockedFeatures: profile.unlockedFeatures ?? [],
    availableAnomalySectors: getAllAnomalySectors().filter((sector) =>
      checkAnomalySectorEligibility(profile, sector.id).eligible
    ).length,
    totalAnomalySectors: getAllAnomalySectors().length
  };
}
