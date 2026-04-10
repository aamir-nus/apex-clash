import test from "node:test";
import assert from "node:assert/strict";
import {
  getAnomalySector,
  getAllAnomalySectors,
  checkAnomalySectorEligibility,
  getFirstGradeTrial,
  getAllFirstGradeTrials,
  getAvailableTrials,
  completeTrial,
  getAscensionEncounter,
  checkAscensionEligibility,
  completeAscension,
  getEndgameStatus
} from "../src/services/endgameService.js";

function createMockProfile(overrides = {}) {
  return {
    id: "test-profile",
    username: "testuser",
    level: 20,
    sorcererGrade: "special_grade_candidate",
    gradeKillLedger: {},
    techniqueMasteryRank: "grade_1_caliber",
    techniqueMasteryProgress: 75,
    techniqueUsageCount: { severing_step: 100 },
    clearedRegionIds: [
      "detention_center",
      "barrier_shrine",
      "shibuya_burn_sector",
      "collapsed_cathedral_barrier",
      "merger_ossuary"
    ],
    specialGradeKills: ["smallpox_deity"],
    specialGradeCandidate: true,
    bossKillCount: 10,
    blackFlashChainCount: 5,
    firstGradeTrialClears: [],
    ascensionComplete: false,
    unlockedFeatures: [],
    inventoryItems: [],
    ...overrides
  };
}

test("anomaly sectors service returns all sectors", () => {
  const sectors = getAllAnomalySectors();
  assert.ok(sectors.length >= 3);

  const ids = sectors.map((s) => s.id);
  assert.ok(ids.includes("void_fracture"));
  assert.ok(ids.includes("domain_remnant"));
  assert.ok(ids.includes("cursed_tool_graveyard"));
});

test("get anomaly sector by ID returns correct data", () => {
  const sector = getAnomalySector("void_fracture");

  assert.equal(sector.id, "void_fracture");
  assert.equal(sector.name, "Void Fracture");
  assert.ok(sector.unlockRequirements);
  assert.equal(sector.unlockRequirements.minGrade, "special_grade_candidate");
});

test("anomaly sector eligibility checks grade requirement", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1" });

  const eligibility = checkAnomalySectorEligibility(profile, "void_fracture");
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("special grade candidate")));
});

test("anomaly sector eligibility checks special grade kills", () => {
  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    specialGradeKills: []
  });

  const eligibility = checkAnomalySectorEligibility(profile, "void_fracture");
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("special grade kills")));
});

test("anomaly sector eligibility passes with all requirements", () => {
  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    level: 20,
    specialGradeKills: ["smallpox_deity"]
  });

  const eligibility = checkAnomalySectorEligibility(profile, "void_fracture");
  assert.equal(eligibility.eligible, true);
});

test("first-grade trials service returns all trials", () => {
  const trials = getAllFirstGradeTrials();
  assert.ok(trials.length >= 8);

  const ids = trials.map((t) => t.id);
  assert.ok(ids.includes("trial_combat_mastery"));
  assert.ok(ids.includes("trial_black_flash_mastery"));
  assert.ok(ids.includes("trial_domain_counter"));
  assert.ok(ids.includes("trial_endurance"));
});

test("get first-grade trial by ID returns correct data", () => {
  const trial = getFirstGradeTrial("trial_black_flash_mastery");

  assert.equal(trial.id, "trial_black_flash_mastery");
  assert.equal(trial.name, "Trial of Black Flash");
  assert.equal(trial.trialType, "mechanic_challenge");
  assert.equal(trial.requiredHits, 5);
});

test("available trials filters by grade requirement", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_2", level: 10 });

  const available = getAvailableTrials(profile);
  // Grade 2 should see trials with grade_2 requirement or lower
  assert.ok(available.length > 0);
  assert.ok(!available.some((t) => t.unlockRequirements?.minGrade === "grade_1"));
});

test("available trials filters by level requirement", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_2", level: 5 });

  const available = getAvailableTrials(profile);
  // Level 5 should not see trials requiring level 10+
  assert.ok(!available.some((t) => (t.unlockRequirements?.minLevel ?? 0) > 5));
});

test("available trials shows completed status", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_2",
    level: 10,
    firstGradeTrialClears: ["trial_combat_mastery"]
  });

  const available = getAvailableTrials(profile);
  const completedTrial = available.find((t) => t.id === "trial_combat_mastery");

  assert.ok(completedTrial);
  assert.equal(completedTrial.isCompleted, true);
  assert.equal(completedTrial.canRetry, false);
});

test("complete trial returns rewards", () => {
  const profile = createMockProfile({ firstGradeTrialClears: [] });

  const result = completeTrial(profile, "trial_combat_mastery");
  assert.equal(result.success, true);
  assert.equal(result.isNewComplete, true);
  assert.ok(result.rewards);
  assert.ok(result.rewards.xpBonus > 0);
  assert.ok(Array.isArray(result.rewards.items));
});

test("complete trial is idempotent", () => {
  const profile = createMockProfile({ firstGradeTrialClears: ["trial_combat_mastery"] });

  const result = completeTrial(profile, "trial_combat_mastery");
  assert.equal(result.success, true);
  assert.equal(result.isNewComplete, false);
});

test("ascension encounter returns S-Class trial data", () => {
  const encounter = getAscensionEncounter("ascension_trial");

  assert.equal(encounter.id, "ascension_trial");
  assert.equal(encounter.name, "S-Class Ascension Trial");
  assert.ok(encounter.stages);
  assert.ok(encounter.stages.length >= 4);
});

test("ascension eligibility checks all requirements", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_1",
    level: 20,
    specialGradeKills: ["smallpox_deity"]
  });

  const eligibility = checkAscensionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  // Should fail because not special_grade_candidate
  assert.ok(eligibility.issues.length > 0);
});

test("ascension eligibility requires all trials complete", () => {
  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    level: 25,
    specialGradeKills: ["smallpox_deity"],
    techniqueMasteryRank: "special_grade_caliber",
    firstGradeTrialClears: ["trial_combat_mastery", "trial_black_flash_mastery"] // Only 2 of 7
  });

  const eligibility = checkAscensionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("trials")));
});

test("ascension eligibility passes with all requirements", () => {
  const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
  const allTrialIds = getAllFirstGradeTrials()
    .filter((t) => t.id !== "trial_s_class_candidate")
    .map((t) => t.id);

  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    level: 25,
    specialGradeKills: ["smallpox_deity", "hunger_census"],
    techniqueMasteryRank: "special_grade_caliber",
    techniqueMasteryProgress: 100,
    firstGradeTrialClears: allTrialIds,
    inventoryItems: [{ id: "ascension_key", quantity: 1 }]
  });

  const eligibility = checkAscensionEligibility(profile);
  assert.equal(eligibility.eligible, true);
});

test("complete ascension promotes to Special Grade", () => {
  const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
  const allTrialIds = getAllFirstGradeTrials()
    .filter((t) => t.id !== "trial_s_class_candidate")
    .map((t) => t.id);

  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    level: 25,
    specialGradeKills: ["smallpox_deity", "hunger_census"],
    techniqueMasteryRank: "special_grade_caliber",
    firstGradeTrialClears: allTrialIds,
    inventoryItems: [{ id: "ascension_key", quantity: 1 }]
  });

  const result = completeAscension(profile);
  assert.equal(result.success, true);
  assert.equal(result.previousGrade, "special_grade_candidate");
  assert.equal(result.newGrade, "special_grade");
  assert.ok(result.rewards);
  assert.ok(result.updatedProfile.ascensionComplete);
});

test("complete ascension fails when ineligible", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1" });

  const result = completeAscension(profile);
  assert.equal(result.success, false);
  assert.ok(result.error || result.issues);
});

test("endgame status returns comprehensive data", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_2",
    level: 12,
    firstGradeTrialClears: ["trial_combat_mastery"],
    specialGradeKills: [],
    bossKillCount: 3,
    techniqueMasteryRank: "refined",
    techniqueMasteryProgress: 25
  });

  const status = getEndgameStatus(profile);

  assert.equal(status.grade, "grade_2");
  assert.equal(status.level, 12);
  assert.equal(status.trialCompletion.completed.length, 1);
  assert.ok(status.trialCompletion.total > 0);
  assert.equal(status.specialGradeKills, 0);
  assert.equal(status.bossKillCount, 3);
  assert.equal(status.techniqueMasteryRank, "refined");
  assert.equal(status.techniqueMasteryProgress, 25);
  assert.equal(status.ascensionComplete, false);
  assert.equal(status.ascensionEligible, false);
  assert.ok(status.totalAnomalySectors > 0);
});

test("endgame status shows ascension eligible when requirements met", () => {
  const totalTrials = getAllFirstGradeTrials().filter((t) => t.id !== "trial_s_class_candidate").length;
  const allTrialIds = getAllFirstGradeTrials()
    .filter((t) => t.id !== "trial_s_class_candidate")
    .map((t) => t.id);

  const profile = createMockProfile({
    sorcererGrade: "special_grade_candidate",
    level: 25,
    specialGradeKills: ["smallpox_deity", "hunger_census"],
    techniqueMasteryRank: "special_grade_caliber",
    techniqueMasteryProgress: 100,
    firstGradeTrialClears: allTrialIds,
    inventoryItems: [{ id: "ascension_key", quantity: 1 }]
  });

  const status = getEndgameStatus(profile);
  assert.equal(status.ascensionEligible, true);
  assert.equal(status.ascensionIssues.length, 0);
});
