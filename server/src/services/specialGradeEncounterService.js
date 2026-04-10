import { getBootstrapContent } from "./contentService.js";

let specialGrades = null;
let encounterTables = null;
let techniqueMasteryRanks = null;

function loadContent() {
  const content = getBootstrapContent();
  if (!specialGrades) {
    specialGrades = new Map(
      content.specialGrades?.map((sg) => [sg.id, sg]) ?? []
    );
  }
  if (!encounterTables) {
    encounterTables = new Map(
      content.encounterTables?.map((et) => [et.id, et]) ?? []
    );
  }
  if (!techniqueMasteryRanks) {
    techniqueMasteryRanks = new Map(
      content.techniqueMastery?.map((tm) => [tm.id, tm]) ?? []
    );
  }
}

/**
 * Get special grade by ID
 */
export function getSpecialGrade(gradeId) {
  loadContent();
  return specialGrades.get(gradeId);
}

/**
 * Get all special grades
 */
export function getAllSpecialGrades() {
  loadContent();
  return Array.from(specialGrades.values());
}

/**
 * Get encounter table for a region
 */
export function getEncounterTable(regionId) {
  loadContent();
  return Array.from(encounterTables.values()).find(
    (table) => table.regionId === regionId
  );
}

/**
 * Get all encounter tables
 */
export function getAllEncounterTables() {
  loadContent();
  return Array.from(encounterTables.values());
}

/**
 * Check if a special grade invasion can spawn for a player profile
 */
export function checkInvasionEligibility(profile, regionId) {
  loadContent();
  const encounterTable = getEncounterTable(regionId);

  if (!encounterTable) {
    return { eligible: false, reason: "No encounter table for region" };
  }

  const playerGrade = profile.sorcererGrade ?? "grade_4";
  const playerLevel = profile.level ?? 1;

  // Check minimum requirements
  if (encounterTable.spawnRules?.minGrade) {
    const gradeRank = {
      special_grade: -1,
      special_grade_candidate: 0,
      grade_1: 1,
      grade_2: 2,
      grade_3: 3,
      grade_4: 4
    };
    const minRank = gradeRank[encounterTable.spawnRules.minGrade] ?? 4;
    const playerRank = gradeRank[playerGrade] ?? 4;

    if (playerRank > minRank) {
      return {
        eligible: false,
        reason: `Requires ${encounterTable.spawnRules.minGrade.replace('_', ' ')}`
      };
    }
  }

  if (encounterTable.spawnRules?.minLevel && playerLevel < encounterTable.spawnRules.minLevel) {
    return {
      eligible: false,
      reason: `Requires level ${encounterTable.spawnRules.minLevel}`
    };
  }

  return {
    eligible: true,
    encounterTable,
    availableGrades: encounterTable.specialGrades?.map((id) => getSpecialGrade(id)) ?? []
  };
}

/**
 * Roll for special grade invasion
 */
export function rollInvasion(profile, regionId, trigger = "room_clear") {
  const eligibility = checkInvasionEligibility(profile, regionId);

  if (!eligibility.eligible) {
    return { invasion: null, reason: eligibility.reason };
  }

  const encounterTable = eligibility.encounterTable;

  // Check if trigger is valid for this table
  if (!encounterTable.spawnTriggers?.includes(trigger)) {
    return { invasion: null, reason: "Invalid trigger" };
  }

  // Roll spawn chance
  const roll = Math.random();
  if (roll > (encounterTable.spawnChancePerRoom ?? 0)) {
    return { invasion: null, reason: "Roll failed" };
  }

  // Select random special grade from available
  const availableGrades = eligibility.availableGrades;
  if (!availableGrades.length) {
    return { invasion: null, reason: "No special grades available" };
  }

  const selectedGrade = availableGrades[Math.floor(Math.random() * availableGrades.length)];

  return {
    invasion: {
      specialGrade: selectedGrade,
      encounterTable: encounterTable.id,
      spawnRegion: regionId,
      omenSignals: encounterTable.ominSignals ?? [],
      escapeOptions: encounterTable.escapeOptions ?? [],
      rewardModifiers: encounterTable.rewardModifiers ?? {}
    }
  };
}

/**
 * Get special grade kill condition
 */
export function getSpecialGradeKillCondition(gradeId) {
  const grade = getSpecialGrade(gradeId);
  return grade?.requiredKillCondition ?? null;
}

/**
 * Check if special grade kill condition is met
 */
export function checkSpecialGradeKillCondition(gradeId, combatData) {
  const condition = getSpecialGradeKillCondition(gradeId);

  if (!condition) {
    return { met: true };
  }

  switch (condition.type) {
    case "mechanic_chain":
      // Check if player chained required hits/conditions
      const chainHits = combatData.blackFlashHitsInWindow ?? 0;
      const requiredHits = condition.requiredHits ?? 3;
      return {
        met: chainHits >= requiredHits,
        progress: chainHits,
        required: requiredHits,
        description: condition.description
      };

    case "interrupt_chain":
      // Check if player interrupted at certain points
      const interrupts = combatData.interruptsInCycle ?? 0;
      const requiredInterrupts = condition.requiredInterrupts ?? 3;
      return {
        met: interrupts >= requiredInterrupts,
        progress: interrupts,
        required: requiredInterrupts,
        description: condition.description
      };

    case "multi_stage":
      // Check multiple stages
      const stagesComplete = combatData.stagesCompleted ?? [];
      const requiredStages = condition.requiredStages ?? [];
      return {
        met: requiredStages.every((stage) => stagesComplete.includes(stage)),
        progress: stagesComplete.length,
        required: requiredStages.length,
        description: condition.description
      };

    default:
      return { met: true };
  }
}

/**
 * Process special grade defeat rewards
 */
export function processSpecialGradeDefeat(profile, gradeId, combatData = {}) {
  const grade = getSpecialGrade(gradeId);
  if (!grade) {
    return { error: "Invalid special grade" };
  }

  // Track special grade kill
  const specialGradeKills = profile.specialGradeKills ?? [];
  const isNewKill = !specialGradeKills.includes(gradeId);

  if (isNewKill) {
    specialGradeKills.push(gradeId);
  }

  // Calculate rewards
  const rewardTable = grade.rewardTable ?? {};
  const baseRewards = rewardTable.baseRewards ?? [];
  const xpBonus = rewardTable.xpBonus ?? 0;

  // Process technique mastery
  const masteryBonus = rewardTable.techniqueMastery ?? null;
  if (masteryBonus) {
    // Add technique mastery progress
    profile.techniqueMasteryProgress = Math.min(
      100,
      (profile.techniqueMasteryProgress ?? 0) + 15
    );
  }

  return {
    success: true,
    isNewKill,
    rewards: baseRewards,
    xpBonus,
    masteryBonus,
    updatedKills: specialGradeKills
  };
}

/**
 * Get special grade encounter framework data for UI
 */
export function getSpecialGradeFrameworkData() {
  loadContent();
  return {
    specialGrades: getAllSpecialGrades().map((sg) => ({
      id: sg.id,
      name: sg.name,
      title: sg.title,
      threatClass: sg.threatClass,
      encounterType: sg.encounterType,
      region: sg.spawnRules?.regions ?? [],
      killCondition: sg.requiredKillCondition?.description ?? null
    })),
    encounterTables: getAllEncounterTables().map((et) => ({
      id: et.id,
      regionId: et.regionId,
      spawnChance: et.spawnChancePerRoom,
      specialGrades: et.specialGrades ?? []
    }))
  };
}
