import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const classes = readJson("shared/content/classes.json");
const regions = readJson("shared/content/regions.json");
const skills = readJson("shared/content/skills.json");
const items = readJson("shared/content/items.json");
const packageJson = readJson("package.json");

const skillBindingsSource = readText("web/src/utils/skillBindings.js");
const movesetPanelSource = readText("web/src/components/MovesetPanel.jsx");
const gameHudSource = readText("web/src/components/GameHud.jsx");
const appSource = readText("web/src/App.jsx");
const hubSceneSource = readText("web/src/game/scenes/HubScene.js");
const regionSceneSource = readText("web/src/game/scenes/RegionScene.js");
const dungeonSceneSource = readText("web/src/game/scenes/DungeonScene.js");
const combatSceneSource = readText("web/src/game/scenes/CombatSandboxScene.js");
const bossSceneSource = readText("web/src/game/scenes/BossScene.js");
const playerProfileServiceSource = readText("server/src/services/playerProfileService.js");

const combatRegions = regions.filter((region) => region.type === "region");
const equippableItems = items.filter((item) => Boolean(item.equipSlot));
const consumables = items.filter((item) => item.type === "consumable");
const materials = items.filter((item) => item.type === "material");
const epicRewards = items.filter((item) => item.rarity === "epic");

const objectiveSceneCoverage = [
  { scene: "hub", hasObjective: hubSceneSource.includes("objective: {") },
  { scene: "region", hasObjective: regionSceneSource.includes("objective: {") },
  { scene: "combat", hasObjective: combatSceneSource.includes("objective: {") },
  { scene: "boss", hasObjective: bossSceneSource.includes("objective: {") }
];

const liveSyncCoverage = [
  { scene: "combat", hasSyncProfile: combatSceneSource.includes("syncProfile(profile)") },
  { scene: "dungeon", hasSyncProfile: dungeonSceneSource.includes("syncProfile(profile)") },
  { scene: "boss", hasSyncProfile: bossSceneSource.includes("syncProfile(profile)") }
];

const tutorialCoverage = {
  appBootFlag: appSource.includes("firstRunTutorial"),
  hubTutorial: hubSceneSource.includes("this.firstRunTutorial"),
  regionTutorial: regionSceneSource.includes("this.firstRunTutorial")
};

const smokeScript = packageJson.scripts["test:smoke"] ?? "";
const smokeChecks = {
  contentValidation: smokeScript.includes("validate:content"),
  serverTests: smokeScript.includes("test:server"),
  backendContract: smokeScript.includes("test:backend-contract"),
  authProfileContract: smokeScript.includes("test:auth-profile-contract"),
  skillBindingContract: smokeScript.includes("test:skill-binding-contract"),
  experienceAudit: smokeScript.includes("test:experience-audit"),
  lint: smokeScript.includes("lint"),
  build: smokeScript.includes("build")
};

const metrics = {
  classes: classes.length,
  combatRegions: combatRegions.length,
  skills: skills.length,
  equippableItems: equippableItems.length,
  consumables: consumables.length,
  materials: materials.length,
  epicRewards: epicRewards.length,
  bindableSkillSlots: JSON.parse(
    skillBindingsSource.match(/BINDABLE_SKILL_KEYS = (\[[^\]]+\])/)?.[1] ?? "[]"
  ).length,
  objectiveScenesCovered: objectiveSceneCoverage.filter((entry) => entry.hasObjective).length,
  liveSyncScenesCovered: liveSyncCoverage.filter((entry) => entry.hasSyncProfile).length
};

assert(classes.length === 4, "Expected exactly 4 class archetypes in content.");
assert(combatRegions.length >= 3, "Expected at least 3 combat regions for the current slice.");
assert(skills.length >= 11, "Expected at least 11 authored skills in content.");
assert(equippableItems.length >= 18, "Expected at least 18 equippable items in content.");
assert(consumables.length >= 2, "Expected consumables to be represented in rewards.");
assert(materials.length >= 3, "Expected materials to be represented in rewards.");
assert(epicRewards.length >= 8, "Expected epic route rewards across current regions.");

assert(
  skillBindingsSource.includes('export const BINDABLE_SKILL_KEYS = ["Q", "E"]'),
  "Expected only Q and E to be bindable skill slots."
);
assert(
  movesetPanelSource.includes("Domain Surge stays on R") &&
    movesetPanelSource.includes("bind or unbind to Q / E"),
  "Moveset panel must reflect the Q/E bind model and reserved R slot."
);
assert(
  gameHudSource.includes("Bound Skills") && gameHudSource.includes("Domain Surge"),
  "HUD must expose bound skills and reserved Domain Surge state."
);
assert(
  tutorialCoverage.appBootFlag && tutorialCoverage.hubTutorial && tutorialCoverage.regionTutorial,
  "First-run tutorial coverage must exist in app boot, hub, and region scenes."
);
assert(
  objectiveSceneCoverage.every((entry) => entry.hasObjective),
  "Hub, region, combat, and boss scenes must emit objective state."
);
assert(
  liveSyncCoverage.every((entry) => entry.hasSyncProfile),
  "Combat, dungeon, and boss scenes must support live profile sync."
);
assert(
  playerProfileServiceSource.includes("slice(0, 2)"),
  "Backend must cap equipped skills to the 2-slot runtime model."
);
assert(
  Object.values(smokeChecks).every(Boolean),
  "Smoke suite must include content, contracts, experience audit, lint, and build."
);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "passed",
      metrics,
      objectiveSceneCoverage,
      liveSyncCoverage,
      tutorialCoverage,
      smokeChecks
    },
    null,
    2
  )}\n`
);
