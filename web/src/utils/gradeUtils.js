/**
 * Grade utility functions for Phase 4 progression system
 * Handles enemy grade mapping, XP multipliers, and kill tracking
 */

// Map curseGrade number to grade ID
export function curseGradeToGradeId(curseGrade) {
  const gradeMap = {
    4: "grade_4",
    3: "grade_3",
    2: "grade_2",
    1: "grade_1",
    0: "special_grade"
  };
  return gradeMap[curseGrade] ?? "grade_4";
}

// Get grade rank (numeric) from grade ID
export function getGradeRank(gradeId) {
  const rankMap = {
    special_grade: -1,
    special_grade_candidate: 0,
    grade_1: 1,
    grade_2: 2,
    grade_3: 3,
    grade_4: 4
  };
  return rankMap[gradeId] ?? 4;
}

// Calculate XP multiplier based on enemy grade vs player grade
export function getXPMultiplier(playerGradeId, enemyCurseGrade) {
  const playerRank = getGradeRank(playerGradeId);
  const enemyRank = enemyCurseGrade; // curseGrade is already numeric
  const gradeDiff = playerRank - enemyRank;

  if (gradeDiff === 0) {
    return 1.0; // Same grade
  } else if (gradeDiff === -1) {
    return 1.5; // One grade above
  } else if (gradeDiff <= -2) {
    return 2.2; // Two or more grades above
  } else {
    return 0.7; // Lower grade
  }
}

// Calculate XP reward with multiplier applied
export function calculateXPReward(baseXP, playerGradeId, enemyCurseGrade) {
  const multiplier = getXPMultiplier(playerGradeId, enemyCurseGrade);
  return Math.floor(baseXP * multiplier);
}

// Record a grade kill in the session state
export function recordGradeKill(sessionState, enemyCurseGrade, enemyId) {
  const gradeId = curseGradeToGradeId(enemyCurseGrade);

  if (!sessionState.gradeKillLedger) {
    sessionState.gradeKillLedger = {
      grade_4: 0,
      grade_3: 0,
      grade_2: 0,
      grade_1: 0,
      special_grade: 0
    };
  }

  // Increment kill count for grade
  sessionState.gradeKillLedger[gradeId] = (sessionState.gradeKillLedger[gradeId] || 0) + 1;

  // Track unique kills
  const uniqueKey = `${gradeId}_unique`;
  if (!sessionState.gradeKillLedger[uniqueKey]) {
    sessionState.gradeKillLedger[uniqueKey] = [];
  }

  if (enemyId && !sessionState.gradeKillLedger[uniqueKey].includes(enemyId)) {
    sessionState.gradeKillLedger[uniqueKey].push(enemyId);
  }

  return sessionState.gradeKillLedger;
}

// Record technique usage for mastery tracking
export function recordTechniqueUsage(sessionState, skillId) {
  if (!sessionState.techniqueUsageCount) {
    sessionState.techniqueUsageCount = {};
  }

  sessionState.techniqueUsageCount[skillId] =
    (sessionState.techniqueUsageCount[skillId] || 0) + 1;

  return sessionState.techniqueUsageCount;
}

// Record boss kill
export function recordBossKill(sessionState, bossId) {
  if (!sessionState.bossKillCount) {
    sessionState.bossKillCount = 0;
  }
  sessionState.bossKillCount += 1;

  // Track special grade kills
  if (bossId && (bossId.includes("special_grade") || bossId.includes("smallpox") ||
      bossId.includes("hunger_census") || bossId.includes("bell_last_rite"))) {
    if (!sessionState.specialGradeKills) {
      sessionState.specialGradeKills = [];
    }
    if (!sessionState.specialGradeKills.includes(bossId)) {
      sessionState.specialGradeKills.push(bossId);
    }
  }

  return sessionState.bossKillCount;
}

// Record Black Flash chain
export function recordBlackFlashChain(sessionState, chainLength) {
  if (!sessionState.blackFlashChainCount) {
    sessionState.blackFlashChainCount = 0;
  }

  // Only count chains of 2+ hits
  if (chainLength >= 2) {
    sessionState.blackFlashChainCount += 1;
  }

  return sessionState.blackFlashChainCount;
}

// Record domain clash
export function recordDomainClash(sessionState) {
  if (!sessionState.domainClashCount) {
    sessionState.domainClashCount = 0;
  }
  sessionState.domainClashCount += 1;
  return sessionState.domainClashCount;
}

// Get grade display info
export function getGradeDisplayInfo(gradeId) {
  const gradeInfo = {
    special_grade: { name: "Special Grade", short: "Special", color: "#FFD700", rank: -1 },
    special_grade_candidate: { name: "Special Grade Candidate", short: "Candidate", color: "#C0C0C0", rank: 0 },
    grade_1: { name: "Grade 1 Sorcerer", short: "1st", color: "#FF6B6B", rank: 1 },
    grade_2: { name: "Grade 2 Sorcerer", short: "2nd", color: "#4ECDC4", rank: 2 },
    grade_3: { name: "Grade 3 Sorcerer", short: "3rd", color: "#45B7D1", rank: 3 },
    grade_4: { name: "Grade 4 Sorcerer", short: "4th", color: "#96CEB4", rank: 4 }
  };
  return gradeInfo[gradeId] || gradeInfo.grade_4;
}

// Check if player is eligible for grade promotion
export function getPromotionProgress(playerGrade, sessionState) {
  const ledger = sessionState.gradeKillLedger || {};
  const promotionRequirements = {
    grade_4: {
      nextGrade: "grade_3",
      levelRequired: 5,
      grade3KillsRequired: 5,
      grade3BossRequired: 1
    },
    grade_3: {
      nextGrade: "grade_2",
      levelRequired: 10,
      grade2KillsRequired: 10
    },
    grade_2: {
      nextGrade: "grade_1",
      levelRequired: 15,
      grade1UniqueKillsRequired: 3,
      grade1TotalKillsRequired: 10
    },
    grade_1: {
      nextGrade: "special_grade_candidate",
      levelRequired: 20,
      specialGradeDefeatRequired: 1
    },
    special_grade_candidate: {
      nextGrade: "special_grade",
      levelRequired: 25,
      specialGradeKillsRequired: 2
    }
  };

  const reqs = promotionRequirements[playerGrade];
  if (!reqs) {
    return { eligible: false, maxGrade: true };
  }

  const issues = [];
  const progress = { total: 0, completed: 0 };

  // Check each requirement
  if (reqs.levelRequired) {
    progress.total++;
    if (sessionState.level >= reqs.levelRequired) {
      progress.completed++;
    } else {
      issues.push(`Reach level ${reqs.levelRequired}`);
    }
  }

  if (reqs.grade3KillsRequired) {
    progress.total++;
    const kills = ledger.grade_3 || 0;
    if (kills >= reqs.grade3KillsRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.grade3KillsRequired - kills} more Grade 3 curses`);
    }
  }

  if (reqs.grade2KillsRequired) {
    progress.total++;
    const kills = ledger.grade_2 || 0;
    if (kills >= reqs.grade2KillsRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.grade2KillsRequired - kills} more Grade 2 curses`);
    }
  }

  if (reqs.grade1UniqueKillsRequired) {
    progress.total++;
    const unique = (ledger.grade_1_unique || []).length;
    if (unique >= reqs.grade1UniqueKillsRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.grade1UniqueKillsRequired - unique} more unique Grade 1 curses`);
    }
  }

  if (reqs.grade1TotalKillsRequired) {
    progress.total++;
    const total = ledger.grade_1 || 0;
    if (total >= reqs.grade1TotalKillsRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.grade1TotalKillsRequired - total} more Grade 1 curses (total)`);
    }
  }

  if (reqs.specialGradeDefeatRequired) {
    progress.total++;
    const sgKills = (sessionState.specialGradeKills || []).length;
    if (sgKills >= reqs.specialGradeDefeatRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.specialGradeDefeatRequired - sgKills} special grade curse`);
    }
  }

  if (reqs.specialGradeKillsRequired) {
    progress.total++;
    const sgKills = (sessionState.specialGradeKills || []).length;
    if (sgKills >= reqs.specialGradeKillsRequired) {
      progress.completed++;
    } else {
      issues.push(`Defeat ${reqs.specialGradeKillsRequired - sgKills} special grade curses`);
    }
  }

  return {
    eligible: issues.length === 0,
    nextGrade: reqs.nextGrade,
    issues,
    progress: progress.total > 0 ? progress.completed / progress.total : 0
  };
}
