import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPromotionEligibility,
  promoteToNextGrade,
  recordGradeKill,
  recordTechniqueUsage,
  getGradeDisplayInfo,
  getXPMultiplier,
  getCurrentGrade,
  getNextPromotionRule,
  getTechniqueMasteryRank
} from "../src/services/gradePromotionService.js";

function createMockProfile(overrides = {}) {
  return {
    id: "test-profile",
    username: "testuser",
    level: 1,
    xp: 0,
    classType: "striker",
    sorcererGrade: "grade_4",
    gradeKillLedger: {},
    techniqueMasteryRank: "novice",
    techniqueMasteryProgress: 0,
    techniqueUsageCount: {},
    clearedRegionIds: [],
    specialGradeKills: [],
    specialGradeCandidate: false,
    ...overrides
  };
}

test("grade promotion service starts player at Grade 4", () => {
  const profile = createMockProfile();
  assert.equal(getCurrentGrade(profile), "grade_4");
});

test("grade promotion returns next promotion rule", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_4" });
  const nextRule = getNextPromotionRule(profile);

  assert.equal(nextRule?.id, "grade_3");
  // Next grade's promotion requirements are for grade_3 -> grade_2
  assert.equal(nextRule?.promotionRequirements?.levelRequired, 10);
});

test("XP multiplier applies correctly for grade differences", () => {
  const grade4Profile = createMockProfile({ sorcererGrade: "grade_4" });

  // Same grade = 1.0x
  assert.equal(getXPMultiplier(grade4Profile, "grade_4"), 1.0);

  // One grade above = 1.5x
  assert.equal(getXPMultiplier(grade4Profile, "grade_3"), 1.5);

  // Two grades above = 2.2x
  assert.equal(getXPMultiplier(grade4Profile, "grade_2"), 2.2);

  // Special grade (highest) = 2.2x (two+ grades above)
  assert.equal(getXPMultiplier(grade4Profile, "special_grade"), 2.2);

  // Lower grade - grade_1 player fighting grade_4 enemy = 0.7x
  const grade1Profile = createMockProfile({ sorcererGrade: "grade_1" });
  assert.equal(getXPMultiplier(grade1Profile, "grade_4"), 0.7);
});

test("grade kill ledger tracks kills by grade", () => {
  const profile = createMockProfile();

  const updatedLedger = recordGradeKill(profile, "grade_3", "wailing_curse");
  assert.equal(updatedLedger.grade_3, 1);
  assert.deepEqual(updatedLedger.grade_3_unique, ["wailing_curse"]);
  assert.equal(updatedLedger.grade_4, 0);

  const updatedLedger2 = recordGradeKill(
    { ...profile, gradeKillLedger: updatedLedger },
    "grade_3",
    "crawling_curse"
  );
  assert.equal(updatedLedger2.grade_3, 2);
  assert.deepEqual(updatedLedger2.grade_3_unique, ["wailing_curse", "crawling_curse"]);
});

test("promotion eligibility checks level requirement", () => {
  const profile = createMockProfile({ level: 3 });

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("Level 5 required")));
});

test("promotion eligibility checks kill requirements for Grade 3", () => {
  const profile = createMockProfile({
    level: 5,
    gradeKillLedger: { grade_3: 3 }
  });

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("5 Grade 3 kills required")));
});

test("promotion eligibility passes with all requirements met", () => {
  const profile = createMockProfile({
    level: 5,
    gradeKillLedger: { grade_3: 5, grade_3_unique: [] },
    clearedRegionIds: ["detention_center"]
  });

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.nextGrade, "grade_3");
});

test("promotion to Grade 3 succeeds when eligible", () => {
  const profile = createMockProfile({
    level: 5,
    gradeKillLedger: { grade_3: 5, grade_3_unique: [] },
    clearedRegionIds: ["detention_center"]
  });

  const result = promoteToNextGrade(profile);
  assert.equal(result.success, true);
  assert.equal(result.newGrade, "grade_3");
  assert.equal(result.previousGrade, "grade_4");
});

test("promotion fails when ineligible", () => {
  const profile = createMockProfile({ level: 3 });

  const result = promoteToNextGrade(profile);
  assert.equal(result.success, false);
  assert.ok(result.issues.length > 0);
});

test("technique usage tracking works", () => {
  const profile = createMockProfile();

  const updatedProfile = recordTechniqueUsage(profile, "severing_step");
  assert.equal(updatedProfile.techniqueUsageCount.severing_step, 1);
  assert.equal(updatedProfile.techniqueMasteryProgress, 0.5);

  const updatedProfile2 = recordTechniqueUsage(updatedProfile, "severing_step");
  assert.equal(updatedProfile2.techniqueUsageCount.severing_step, 2);
  assert.equal(updatedProfile2.techniqueMasteryProgress, 1.0);
});

test("technique mastery rank returns correct data", () => {
  const profile = createMockProfile({ techniqueMasteryRank: "novice" });

  const rank = getTechniqueMasteryRank(profile);
  assert.equal(rank.id, "novice");
  assert.equal(rank.rank, 0);
  assert.equal(rank.name, "Novice");
});

test("technique mastery progress accelerates with combat milestones", () => {
  const profile = createMockProfile({
    bossKillCount: 2,
    blackFlashChainCount: 1,
    domainClashCount: 1
  });

  const updatedProfile = recordTechniqueUsage(profile, "severing_step");
  // Base: 0.5 + boss kills: 2*2=4 + black flash: 1*5=5 + domain clash: 1*3=3 = 12.5 total
  assert.ok(updatedProfile.techniqueMasteryProgress >= 12);
});

test("grade display info returns correct colors and names", () => {
  const grade1Info = getGradeDisplayInfo("grade_1");
  assert.equal(grade1Info.name, "Grade 1 Sorcerer");
  assert.equal(grade1Info.color, "#FF6B6B");

  const specialGradeInfo = getGradeDisplayInfo("special_grade");
  assert.equal(specialGradeInfo.name, "Special Grade Sorcerer");
  assert.equal(specialGradeInfo.color, "#FFD700");
});

test("max grade (Special Grade) has no next promotion", () => {
  const profile = createMockProfile({ sorcererGrade: "special_grade" });

  const nextRule = getNextPromotionRule(profile);
  assert.equal(nextRule, null);

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.reason, "Max grade reached");
});

test("promotion eligibility for Grade 2 checks kill count", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_3",
    level: 10,
    gradeKillLedger: { grade_2: 5 }
  });

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("10 Grade 2 kills required")));
});

test("promotion eligibility for Grade 1 checks unique kills", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_2",
    level: 15,
    gradeKillLedger: {
      grade_1: 10,
      grade_1_unique: ["boss1", "boss2"]
    }
  });

  const eligibility = checkPromotionEligibility(profile);
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.issues.some((issue) => issue.includes("3 unique Grade 1 kills required")));
});

test("special grade candidate flag is set on promotion", () => {
  const profile = createMockProfile({
    sorcererGrade: "grade_1",
    level: 20,
    gradeKillLedger: {
      grade_1: 20,
      grade_1_unique: ["boss1", "boss2", "boss3"]
    },
    firstGradeTrialClears: ["trial1", "trial2", "trial3", "trial4", "trial5", "trial6", "trial7", "trial8", "trial9"],
    specialGradeKills: ["smallpox_deity"],
    techniqueMasteryRank: "grade_1_caliber"
  });

  const result = promoteToNextGrade(profile);
  assert.equal(result.success, true);
  assert.equal(result.newGrade, "special_grade_candidate");
  assert.equal(result.profile.specialGradeCandidate, true);
});
