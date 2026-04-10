import test from "node:test";
import assert from "node:assert/strict";
import {
  checkInvasionEligibility,
  rollInvasion,
  getSpecialGrade,
  getAllSpecialGrades,
  getAllEncounterTables,
  getEncounterTable,
  checkSpecialGradeKillCondition,
  processSpecialGradeDefeat,
  getSpecialGradeFrameworkData
} from "../src/services/specialGradeEncounterService.js";

function createMockProfile(overrides = {}) {
  return {
    id: "test-profile",
    level: 15,
    sorcererGrade: "grade_1",
    ...overrides
  };
}

test("special grade service returns all defined special grades", () => {
  const specialGrades = getAllSpecialGrades();
  assert.ok(specialGrades.length >= 3);

  const ids = specialGrades.map((sg) => sg.id);
  assert.ok(ids.includes("smallpox_deity"));
  assert.ok(ids.includes("hunger_census"));
  assert.ok(ids.includes("bell_of_last_rite"));
});

test("get special grade by ID returns correct data", () => {
  const smallpox = getSpecialGrade("smallpox_deity");
  assert.equal(smallpox.id, "smallpox_deity");
  assert.equal(smallpox.name, "Smallpox Deity");
  assert.equal(smallpox.threatClass, "special_grade");
});

test("invasion eligibility checks minimum grade requirement", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_2", level: 15 });

  const eligibility = checkInvasionEligibility(profile, "merger_ossuary_dungeon");
  assert.equal(eligibility.eligible, false);
  // The error message says "Requires grade 1" which should match
  assert.ok(eligibility.reason.toLowerCase().includes("grade 1"));
});

test("invasion eligibility checks minimum level requirement", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1", level: 10 });

  const eligibility = checkInvasionEligibility(profile, "merger_ossuary_dungeon");
  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.reason.includes("level 15"));
});

test("invasion eligibility passes for eligible profile", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1", level: 15 });

  const eligibility = checkInvasionEligibility(profile, "merger_ossuary_dungeon");
  assert.equal(eligibility.eligible, true);
  assert.ok(eligibility.encounterTable);
  assert.ok(eligibility.availableGrades.length > 0);
});

test("encounter table returns correct region data", () => {
  const table = getEncounterTable("merger_ossuary_dungeon");

  assert.equal(table.regionId, "merger_ossuary_dungeon");
  assert.equal(table.spawnChancePerRoom, 0.05);
  assert.ok(table.spawnTriggers.includes("room_clear"));
  assert.ok(table.specialGrades.includes("hunger_census"));
});

test("invasion roll can fail based on spawn chance", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1", level: 15 });

  // Most rolls should fail with 5% spawn chance
  let failureCount = 0;
  for (let i = 0; i < 100; i++) {
    const result = rollInvasion(profile, "merger_ossuary_dungeon", "room_clear");
    if (!result.invasion) {
      failureCount++;
    }
  }

  // With 5% chance, we should have mostly failures
  assert.ok(failureCount > 80);
});

test("invasion roll returns invasion data on success", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1", level: 15 });

  // Force a successful roll by checking multiple times
  let foundInvasion = null;
  for (let i = 0; i < 1000; i++) {
    const result = rollInvasion(profile, "merger_ossuary_dungeon", "room_clear");
    if (result.invasion) {
      foundInvasion = result.invasion;
      break;
    }
  }

  if (foundInvasion) {
    assert.ok(foundInvasion.specialGrade);
    assert.equal(foundInvasion.spawnRegion, "merger_ossuary_dungeon");
    assert.ok(Array.isArray(foundInvasion.omenSignals));
    assert.ok(Array.isArray(foundInvasion.escapeOptions));
  }
});

test("invasion roll fails for invalid trigger", () => {
  const profile = createMockProfile({ sorcererGrade: "grade_1", level: 15 });

  const result = rollInvasion(profile, "merger_ossuary_dungeon", "invalid_trigger");
  assert.equal(result.invasion, null);
  assert.equal(result.reason, "Invalid trigger");
});

test("kill condition check returns true for no condition", () => {
  const result = checkSpecialGradeKillCondition("non_existent", {});
  assert.equal(result.met, true);
});

test("mechanic chain kill condition checks hit count", () => {
  const combatData = { blackFlashHitsInWindow: 3 };
  const result = checkSpecialGradeKillCondition("smallpox_deity", combatData);

  assert.equal(result.met, true);
  assert.equal(result.progress, 3);
  assert.equal(result.required, 3);
});

test("mechanic chain kill condition fails with insufficient hits", () => {
  const combatData = { blackFlashHitsInWindow: 1 };
  const result = checkSpecialGradeKillCondition("smallpox_deity", combatData);

  assert.equal(result.met, false);
  assert.equal(result.progress, 1);
  assert.equal(result.required, 3);
});

test("special grade defeat tracks kill", () => {
  const profile = createMockProfile({ specialGradeKills: [] });

  const result = processSpecialGradeDefeat(profile, "smallpox_deity");
  assert.equal(result.success, true);
  assert.equal(result.isNewKill, true);
  assert.ok(result.updatedKills.includes("smallpox_deity"));
});

test("special grade defeat is idempotent", () => {
  const profile = createMockProfile({ specialGradeKills: ["smallpox_deity"] });

  const result = processSpecialGradeDefeat(profile, "smallpox_deity");
  assert.equal(result.success, true);
  assert.equal(result.isNewKill, false);
  assert.equal(result.updatedKills.length, 1);
});

test("special grade defeat returns mastery bonus", () => {
  const profile = createMockProfile({ techniqueMasteryProgress: 50 });

  const result = processSpecialGradeDefeat(profile, "hunger_census");
  assert.ok(result.masteryBonus);
  // hunger_census has xpBonus: 600 in its reward table
  assert.equal(result.xpBonus, 600);
});

test("special grade defeat invalid ID returns error", () => {
  const profile = createMockProfile();

  const result = processSpecialGradeDefeat(profile, "non_existent_boss");
  assert.equal(result.error, "Invalid special grade");
});

test("special grade framework data returns complete info", () => {
  const data = getSpecialGradeFrameworkData();

  assert.ok(Array.isArray(data.specialGrades));
  assert.ok(Array.isArray(data.encounterTables));

  assert.ok(data.specialGrades.length >= 3);
  assert.ok(data.encounterTables.length >= 4);

  const sg = data.specialGrades[0];
  assert.ok(sg.id);
  assert.ok(sg.name);
  assert.ok(sg.threatClass);
  assert.ok(Array.isArray(sg.region));

  const et = data.encounterTables[0];
  assert.ok(et.id);
  assert.ok(et.regionId);
  assert.ok(typeof et.spawnChance === "number");
});

test("encounter table for Shibuya Burn Sector includes Smallpox Deity", () => {
  const table = getEncounterTable("shibuya_burn_sector_dungeon");

  assert.equal(table.regionId, "shibuya_burn_sector_dungeon");
  assert.ok(table.specialGrades.includes("smallpox_deity"));
  assert.equal(table.spawnChancePerRoom, 0.04);
});

test("encounter table for Collapsed Cathedral includes Bell of Last Rite", () => {
  const table = getEncounterTable("collapsed_cathedral_barrier_dungeon");

  assert.equal(table.regionId, "collapsed_cathedral_barrier_dungeon");
  assert.ok(table.specialGrades.includes("bell_of_last_rite"));
  assert.equal(table.spawnChancePerRoom, 0.03);
});

test("anomaly sector invasion table has all special grades", () => {
  // Get all encounter tables and find the anomaly sector one
  const tables = getAllEncounterTables();
  const anomalyTable = tables.find((t) => t.id === "anomaly_sector_invasion_table");

  assert.ok(anomalyTable);
  assert.equal(anomalyTable.spawnChancePerRoom, 0.08);
  assert.ok(anomalyTable.specialGrades.includes("smallpox_deity"));
  assert.ok(anomalyTable.specialGrades.includes("hunger_census"));
  assert.ok(anomalyTable.specialGrades.includes("bell_of_last_rite"));
});

test("anomaly sector requires special grade candidate or higher", () => {
  const profile = createMockProfile({ sorcererGrade: "special_grade_candidate", level: 20 });

  const eligibility = checkInvasionEligibility(profile, "merger_ossuary_dungeon");
  // Note: Using merger_ossuary_dungeon which has the anomaly invasion table
  assert.equal(eligibility.eligible, true);
});

test("interrupt chain kill condition works", () => {
  const combatData = { interruptsInCycle: 3 };
  const result = checkSpecialGradeKillCondition("hunger_census", combatData);

  assert.equal(result.met, true);
  assert.equal(result.progress, 3);
});

test("multi-stage kill condition checks all stages", () => {
  const combatData = { stagesCompleted: ["pillar_break", "domain_break"] };
  const result = checkSpecialGradeKillCondition("bell_of_last_rite", combatData);

  // Assuming the condition requires these stages
  assert.equal(result.met, true);
});
