import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  createGuestSession,
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../src/controllers/authController.js";
import { getContentBootstrap } from "../src/controllers/contentController.js";
import {
  applyPlayerCombatProgression,
  applyPlayerLevelChoice,
  claimPlayerDungeonReward,
  equipPlayerInventoryItem,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
  updatePlayerSession,
  updatePlayerClass
} from "../src/controllers/playerController.js";
import { createSaveSlot, getSaveSlot, updateSaveSlot } from "../src/controllers/saveController.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { requestLogger } from "../src/middleware/requestLogger.js";
import { getBootstrapContent } from "../src/services/contentService.js";

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test("content service returns bootstrap payload", () => {
  const payload = getBootstrapContent();

  assert.equal(Array.isArray(payload.classes), true);
  assert.equal(Array.isArray(payload.enemies), true);
  assert.equal(Array.isArray(payload.skills), true);
  assert.equal(payload.classes.length > 0, true);
});

test("content controller returns bootstrap response", () => {
  const response = createMockResponse();

  getContentBootstrap({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(Array.isArray(response.payload.data.items), true);
});

test("auth controller creates guest session", () => {
  const response = createMockResponse();

  createGuestSession({}, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.data.mode, "guest");
});

test("auth controller registers, logs in, and returns current session", async () => {
  const registerResponse = createMockResponse();
  await registerUserSession(
    {
      id: "req-register",
      body: { username: "tester", password: "secret12" }
    },
    registerResponse
  );
  assert.equal(registerResponse.statusCode, 201);

  const loginResponse = createMockResponse();
  await loginUserSession(
    {
      id: "req-login",
      body: { username: "tester", password: "secret12" }
    },
    loginResponse
  );
  assert.equal(loginResponse.statusCode, 200);
  assert.equal(Boolean(loginResponse.payload.data.token), true);

  const meResponse = createMockResponse();
  await getCurrentSession(
    {
      headers: {
        authorization: `Bearer ${loginResponse.payload.data.token}`
      }
    },
    meResponse
  );
  assert.equal(meResponse.statusCode, 200);
  assert.equal(meResponse.payload.data.user.username, "tester");
  assert.equal(meResponse.payload.data.user.role, "player");
});

test("auth controller logs into the seeded admin account", async () => {
  const loginResponse = createMockResponse();
  await loginUserSession(
    {
      id: "req-login-admin",
      body: { username: "admin", password: "admin" }
    },
    loginResponse
  );

  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.payload.data.user.username, "admin");
  assert.equal(loginResponse.payload.data.user.role, "admin");
});

test("player profile endpoints keep loadout logic server-side", async () => {
  const registerResponse = createMockResponse();
  await registerUserSession(
    {
      id: "req-register-player",
      body: { username: "loadoutuser", password: "secret12" }
    },
    registerResponse
  );

  const loginResponse = createMockResponse();
  await loginUserSession(
    {
      id: "req-login-player",
      body: { username: "loadoutuser", password: "secret12" }
    },
    loginResponse
  );

  const request = {
    id: "req-player-profile",
    authUser: loginResponse.payload.data.user
  };

  const profileResponse = createMockResponse();
  await getPlayerProfile(request, profileResponse);
  assert.equal(profileResponse.statusCode, 200);
  assert.equal(profileResponse.payload.data.classType, "close_combat");

  const invalidDungeonRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "dungeon_miniboss",
        regionId: "shatter_dungeon"
      }
    },
    invalidDungeonRewardResponse
  );
  assert.equal(invalidDungeonRewardResponse.statusCode, 400);
  assert.equal(invalidDungeonRewardResponse.payload.error, "Invalid reward context");

  const classResponse = createMockResponse();
  await updatePlayerClass(
    {
      ...request,
      body: { classType: "heavenly_restriction" }
    },
    classResponse
  );
  assert.equal(classResponse.statusCode, 200);
  assert.equal(classResponse.payload.data.classType, "heavenly_restriction");

  const equipItemResponse = createMockResponse();
  await equipPlayerInventoryItem(
    {
      ...request,
      body: { itemId: "grave_polearm" }
    },
    equipItemResponse
  );
  assert.equal(equipItemResponse.statusCode, 200);
  assert.equal(equipItemResponse.payload.data.computedStats.attack >= 19, true);

  const equipSkillResponse = createMockResponse();
  await equipPlayerLoadoutSkills(
    {
      ...request,
      body: { skillIds: ["predator_sense", "bone_breaker"] }
    },
    equipSkillResponse
  );
  assert.equal(equipSkillResponse.statusCode, 200);
  assert.equal(equipSkillResponse.payload.data.equippedSkills.length, 2);

  const persistedProfileResponse = createMockResponse();
  await getPlayerProfile(request, persistedProfileResponse);
  assert.equal(persistedProfileResponse.statusCode, 200);
  assert.equal(persistedProfileResponse.payload.data.classType, "heavenly_restriction");
  assert.equal(
    persistedProfileResponse.payload.data.equippedItems.some((item) => item.id === "grave_polearm"),
    true
  );
  assert.deepEqual(
    persistedProfileResponse.payload.data.equippedSkills.map((skill) => skill.id),
    ["predator_sense", "bone_breaker"]
  );

  const cappedSkillResponse = createMockResponse();
  await equipPlayerLoadoutSkills(
    {
      ...request,
      body: { skillIds: ["predator_sense", "bone_breaker", "predator_sense"] }
    },
    cappedSkillResponse
  );
  assert.equal(cappedSkillResponse.statusCode, 200);
  assert.deepEqual(
    cappedSkillResponse.payload.data.equippedSkills.map((skill) => skill.id),
    ["predator_sense", "bone_breaker"]
  );

  const progressionResponse = createMockResponse();
  await applyPlayerLevelChoice(
    {
      ...request,
      body: {
        optionId: "attack",
        runtimeState: {
          level: 2,
          xp: 8,
          xpToNextLevel: 50,
          pendingStatPoints: 1
        }
      }
    },
    progressionResponse
  );
  assert.equal(progressionResponse.statusCode, 200);
  assert.equal(progressionResponse.payload.data.level, 2);
  assert.equal(progressionResponse.payload.data.pendingStatPoints, 0);
  assert.equal(progressionResponse.payload.data.statAllocations.attack, 1);

  const combatRewardResponse = createMockResponse();
  await applyPlayerCombatProgression(
    {
      ...request,
      body: {
        level: 2,
        xp: 45,
        pendingStatPoints: 0,
        xpGained: 20
      }
    },
    combatRewardResponse
  );
  assert.equal(combatRewardResponse.statusCode, 200);
  assert.equal(combatRewardResponse.payload.data.level, 3);
  assert.equal(combatRewardResponse.payload.data.xp, 15);
  assert.equal(combatRewardResponse.payload.data.pendingStatPoints, 1);

  const sessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "shatter_dungeon",
        unlockedRegionIds: ["shatter_block", "veil_shrine"],
        sessionState: {
          explorationBonus: {
            label: "Technique resonance",
            ceBonus: 18
          },
          dungeonRelicClaimed: true,
          dungeonRelicClaimedRegionId: "shatter_dungeon"
        }
      }
    },
    sessionResponse
  );
  assert.equal(sessionResponse.statusCode, 200);
  assert.equal(sessionResponse.payload.data.currentRegionId, "shatter_dungeon");
  assert.deepEqual(sessionResponse.payload.data.unlockedRegionIds, ["shatter_block", "veil_shrine"]);
  assert.equal(sessionResponse.payload.data.sessionState.dungeonRelicClaimed, true);
  assert.equal(sessionResponse.payload.data.sessionState.dungeonRelicClaimedRegionId, "shatter_dungeon");

  const mergedSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        sessionState: {
          bossDoorUnlocked: true
        }
      }
    },
    mergedSessionResponse
  );
  assert.equal(mergedSessionResponse.statusCode, 200);
  assert.equal(mergedSessionResponse.payload.data.sessionState.dungeonRelicClaimed, true);
  assert.equal(mergedSessionResponse.payload.data.sessionState.bossDoorUnlocked, true);

  const inventoryRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "dungeon_miniboss",
        regionId: "shatter_dungeon"
      }
    },
    inventoryRewardResponse
  );
  assert.equal(inventoryRewardResponse.statusCode, 200);
  assert.equal(Boolean(inventoryRewardResponse.payload.data.reward?.id), true);
  assert.equal(inventoryRewardResponse.payload.data.bonusRewards.length, 2);
  assert.equal(
    inventoryRewardResponse.payload.data.profile.inventoryItems.some(
      (item) => item.id === inventoryRewardResponse.payload.data.reward.id
    ),
    true
  );
  assert.equal(
    inventoryRewardResponse.payload.data.profile.inventoryItems.some((item) => item.id === "field_tonic"),
    true
  );
  assert.equal(
    inventoryRewardResponse.payload.data.profile.inventoryItems.some((item) => item.id === "cursed_resin"),
    true
  );

  const duplicateRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "dungeon_miniboss",
        regionId: "shatter_dungeon"
      }
    },
    duplicateRewardResponse
  );
  assert.equal(duplicateRewardResponse.statusCode, 200);
  assert.equal(duplicateRewardResponse.payload.data.reward, null);
  assert.equal(
    duplicateRewardResponse.payload.data.profile.inventoryItems.filter(
      (item) => item.id === inventoryRewardResponse.payload.data.reward.id
    ).length,
    1
  );

  const invalidVeilRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_miniboss",
        regionId: "shatter_dungeon"
      }
    },
    invalidVeilRewardResponse
  );
  assert.equal(invalidVeilRewardResponse.statusCode, 400);
  assert.equal(invalidVeilRewardResponse.payload.error, "Invalid reward context");

  const veilSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "veil_dungeon",
        sessionState: {
          dungeonRelicClaimedRegionId: "shatter_dungeon"
        }
      }
    },
    veilSessionResponse
  );
  assert.equal(veilSessionResponse.statusCode, 200);

  const invalidVeilRelicMismatchResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_miniboss",
        regionId: "veil_dungeon"
      }
    },
    invalidVeilRelicMismatchResponse
  );
  assert.equal(invalidVeilRelicMismatchResponse.statusCode, 400);
  assert.equal(invalidVeilRelicMismatchResponse.payload.error, "Invalid reward context");

  const clearedVeilRelicSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "veil_dungeon",
        sessionState: {
          dungeonRelicClaimed: true,
          dungeonRelicClaimedRegionId: "veil_dungeon"
        }
      }
    },
    clearedVeilRelicSessionResponse
  );
  assert.equal(clearedVeilRelicSessionResponse.statusCode, 200);

  const veilMinibossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_miniboss",
        regionId: "veil_dungeon"
      }
    },
    veilMinibossRewardResponse
  );
  assert.equal(veilMinibossRewardResponse.statusCode, 200);
  assert.equal(veilMinibossRewardResponse.payload.data.reward.rarity, "epic");
  assert.equal(
    veilMinibossRewardResponse.payload.data.profile.inventoryItems.some(
      (item) => item.id === veilMinibossRewardResponse.payload.data.reward.id
    ),
    true
  );

  const duplicateVeilMinibossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_miniboss",
        regionId: "veil_dungeon"
      }
    },
    duplicateVeilMinibossRewardResponse
  );
  assert.equal(duplicateVeilMinibossRewardResponse.statusCode, 200);
  assert.equal(duplicateVeilMinibossRewardResponse.payload.data.reward, null);
  assert.equal(
    duplicateVeilMinibossRewardResponse.payload.data.profile.inventoryItems.filter(
      (item) => item.id === veilMinibossRewardResponse.payload.data.reward.id
    ).length,
    1
  );

  const cinderSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "cinder_dungeon",
        sessionState: {
          dungeonRelicClaimedRegionId: "veil_dungeon"
        }
      }
    },
    cinderSessionResponse
  );
  assert.equal(cinderSessionResponse.statusCode, 200);

  const invalidCinderRelicMismatchResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_miniboss",
        regionId: "cinder_dungeon"
      }
    },
    invalidCinderRelicMismatchResponse
  );
  assert.equal(invalidCinderRelicMismatchResponse.statusCode, 400);
  assert.equal(invalidCinderRelicMismatchResponse.payload.error, "Invalid reward context");

  const clearedCinderRelicSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "cinder_dungeon",
        sessionState: {
          dungeonRelicClaimed: true,
          dungeonRelicClaimedRegionId: "cinder_dungeon"
        }
      }
    },
    clearedCinderRelicSessionResponse
  );
  assert.equal(clearedCinderRelicSessionResponse.statusCode, 200);

  const cinderMinibossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_miniboss",
        regionId: "cinder_dungeon"
      }
    },
    cinderMinibossRewardResponse
  );
  assert.equal(cinderMinibossRewardResponse.statusCode, 200);
  assert.equal(cinderMinibossRewardResponse.payload.data.reward.rarity, "epic");
  assert.equal(cinderMinibossRewardResponse.payload.data.bonusRewards.length, 2);
  assert.equal(
    cinderMinibossRewardResponse.payload.data.profile.inventoryItems.some(
      (item) => item.id === cinderMinibossRewardResponse.payload.data.reward.id
    ),
    true
  );
  assert.equal(
    cinderMinibossRewardResponse.payload.data.profile.inventoryItems.some((item) => item.id === "ember_tonic"),
    true
  );
  assert.equal(
    cinderMinibossRewardResponse.payload.data.profile.inventoryItems.some((item) => item.id === "furnace_core"),
    true
  );

  const duplicateCinderMinibossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_miniboss",
        regionId: "cinder_dungeon"
      }
    },
    duplicateCinderMinibossRewardResponse
  );
  assert.equal(duplicateCinderMinibossRewardResponse.statusCode, 200);
  assert.equal(duplicateCinderMinibossRewardResponse.payload.data.reward, null);
  assert.equal(
    duplicateCinderMinibossRewardResponse.payload.data.profile.inventoryItems.filter(
      (item) => item.id === cinderMinibossRewardResponse.payload.data.reward.id
    ).length,
    1
  );

  const veilBossSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "veil_boss_vault",
        sessionState: {
          clearedBossRegionId: "shatter_boss_vault"
        }
      }
    },
    veilBossSessionResponse
  );
  assert.equal(veilBossSessionResponse.statusCode, 200);
  assert.equal(
    veilBossSessionResponse.payload.data.clearedRegionIds.includes("shatter_block"),
    true
  );

  const invalidScrollRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_boss_scroll",
        regionId: "veil_boss_vault"
      }
    },
    invalidScrollRewardResponse
  );
  assert.equal(invalidScrollRewardResponse.statusCode, 400);
  assert.equal(invalidScrollRewardResponse.payload.error, "Invalid reward context");

  const invalidCinderBossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_boss_core",
        regionId: "cinder_boss_vault"
      }
    },
    invalidCinderBossRewardResponse
  );
  assert.equal(invalidCinderBossRewardResponse.statusCode, 400);
  assert.equal(invalidCinderBossRewardResponse.payload.error, "Invalid reward context");

  const clearedVeilBossSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "veil_boss_vault",
        sessionState: {
          clearedBossRegionId: "veil_boss_vault"
        }
      }
    },
    clearedVeilBossSessionResponse
  );
  assert.equal(clearedVeilBossSessionResponse.statusCode, 200);

  const scrollRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_boss_scroll",
        regionId: "veil_boss_vault"
      }
    },
    scrollRewardResponse
  );
  assert.equal(scrollRewardResponse.statusCode, 200);
  assert.equal(scrollRewardResponse.payload.data.reward.type, "scroll");
  assert.equal(scrollRewardResponse.payload.data.bonusRewards.length <= 1, true);
  assert.equal(
    scrollRewardResponse.payload.data.profile.availableSkills.some(
      (skill) => skill.id === scrollRewardResponse.payload.data.reward.id
    ),
    true
  );
  assert.equal(
    scrollRewardResponse.payload.data.profile.inventoryItems.some((item) => item.id === "veil_shard"),
    true
  );

  const duplicateScrollRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "veil_boss_scroll",
        regionId: "veil_boss_vault"
      }
    },
    duplicateScrollRewardResponse
  );
  assert.equal(duplicateScrollRewardResponse.statusCode, 200);
  assert.equal(duplicateScrollRewardResponse.payload.data.reward, null);
  assert.equal(
    duplicateScrollRewardResponse.payload.data.profile.availableSkills.filter(
      (skill) => skill.id === scrollRewardResponse.payload.data.reward.id
    ).length,
    1
  );

  const clearedCinderBossSessionResponse = createMockResponse();
  await updatePlayerSession(
    {
      ...request,
      body: {
        regionId: "cinder_boss_vault",
        sessionState: {
          clearedBossRegionId: "cinder_boss_vault"
        }
      }
    },
    clearedCinderBossSessionResponse
  );
  assert.equal(clearedCinderBossSessionResponse.statusCode, 200);

  const cinderBossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_boss_core",
        regionId: "cinder_boss_vault"
      }
    },
    cinderBossRewardResponse
  );
  assert.equal(cinderBossRewardResponse.statusCode, 200);
  assert.equal(cinderBossRewardResponse.payload.data.reward.rarity, "epic");
  assert.equal(cinderBossRewardResponse.payload.data.bonusRewards.length <= 2, true);
  assert.equal(
    cinderBossRewardResponse.payload.data.profile.inventoryItems.some(
      (item) => item.id === cinderBossRewardResponse.payload.data.reward.id
    ),
    true
  );

  const duplicateCinderBossRewardResponse = createMockResponse();
  await claimPlayerDungeonReward(
    {
      ...request,
      body: {
        rewardSource: "cinder_boss_core",
        regionId: "cinder_boss_vault"
      }
    },
    duplicateCinderBossRewardResponse
  );
  assert.equal(duplicateCinderBossRewardResponse.statusCode, 200);
  assert.equal(duplicateCinderBossRewardResponse.payload.data.reward, null);
});

test("save controller stores progression-oriented player state", async () => {
  const createResponse = createMockResponse();

  await createSaveSlot(
    {
      id: "req-create-valid",
      body: {
        archetypeId: "mid_range",
        label: "Progression Slot"
      }
    },
    createResponse
  );

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.payload.data.playerState.level, 1);
  assert.equal(createResponse.payload.data.playerState.ce, 82);
  assert.equal(createResponse.payload.data.playerState.attack, 13);

  const updateResponse = createMockResponse();
  await updateSaveSlot(
    {
      id: "req-update-valid",
      params: { slotId: createResponse.payload.data.id },
      body: {
        playerState: {
          level: 3,
          xp: 12,
          pendingStatPoints: 2
        },
        sessionSummary: {
          enemiesRemaining: 1
        }
      }
    },
    updateResponse
  );

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(updateResponse.payload.data.playerState.level, 3);
  assert.equal(updateResponse.payload.data.sessionSummary.enemiesRemaining, 1);

  const getResponse = createMockResponse();
  await getSaveSlot(
    { id: "req-get-valid", params: { slotId: createResponse.payload.data.id } },
    getResponse
  );
  assert.equal(getResponse.statusCode, 200);
  assert.equal(getResponse.payload.data.playerState.pendingStatPoints, 2);
  assert.equal("stats" in getResponse.payload.data, false);
});

test("save controller rejects invalid archetypes", async () => {
  const response = createMockResponse();

  await createSaveSlot(
    {
      id: "req-invalid-archetype",
      body: {
        archetypeId: "not_real"
      }
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.error, "Invalid archetypeId");
});

test("request logger emits start and completion records with request id", () => {
  const output = [];
  const originalLog = console.log;
  console.log = (line) => output.push(line);

  try {
    const request = {
      method: "GET",
      originalUrl: "/health"
    };
    const response = new EventEmitter();
    response.statusCode = 200;

    requestLogger(request, response, () => {});
    response.emit("finish");

    assert.equal(output.length, 2);
    assert.match(output[0], /HTTP request started/);
    assert.match(output[0], /"requestId":"req-/);
    assert.match(output[1], /HTTP request completed/);
    assert.match(output[1], /"statusCode":200/);
  } finally {
    console.log = originalLog;
  }
});

test("error handler logs request context", () => {
  const output = [];
  const originalError = console.error;
  console.error = (line) => output.push(line);

  try {
    const response = createMockResponse();
    errorHandler(
      new Error("boom"),
      {
        id: "req-test",
        method: "PUT",
        originalUrl: "/save/slot-1"
      },
      response
    );

    assert.equal(response.statusCode, 500);
    assert.equal(response.payload.ok, false);
    assert.match(output[0], /Unhandled request error/);
    assert.match(output[0], /"requestId":"req-test"/);
  } finally {
    console.error = originalError;
  }
});

test("player controller logs invalid reward claim context", async () => {
  const output = [];
  const originalWarn = console.warn;
  console.warn = (line) => output.push(line);

  try {
    const registerResponse = createMockResponse();
    await registerUserSession(
      {
        id: "req-register-log-player",
        body: { username: "logrewarduser", password: "secret12" }
      },
      registerResponse
    );

    const loginResponse = createMockResponse();
    await loginUserSession(
      {
        id: "req-login-log-player",
        body: { username: "logrewarduser", password: "secret12" }
      },
      loginResponse
    );

    const response = createMockResponse();
    await claimPlayerDungeonReward(
      {
        id: "req-log-invalid-reward",
        authUser: loginResponse.payload.data.user,
        body: {
          rewardSource: "veil_miniboss",
          regionId: "hub_blacksite"
        }
      },
      response
    );

    assert.equal(response.statusCode, 400);
    assert.match(output[0], /Rejected reward claim/);
    assert.match(output[0], /"requestId":"req-log-invalid-reward"/);
    assert.match(output[0], /"rewardSource":"veil_miniboss"/);
    assert.match(output[0], /"regionId":"hub_blacksite"/);
  } finally {
    console.warn = originalWarn;
  }
});

test("player controller logs invalid skill equip context", async () => {
  const output = [];
  const originalWarn = console.warn;
  console.warn = (line) => output.push(line);

  try {
    const registerResponse = createMockResponse();
    await registerUserSession(
      {
        id: "req-register-log-skill",
        body: { username: "logskilluser", password: "secret12" }
      },
      registerResponse
    );

    const loginResponse = createMockResponse();
    await loginUserSession(
      {
        id: "req-login-log-skill",
        body: { username: "logskilluser", password: "secret12" }
      },
      loginResponse
    );

    const response = createMockResponse();
    await equipPlayerLoadoutSkills(
      {
        id: "req-log-invalid-skill",
        authUser: loginResponse.payload.data.user,
        body: {
          skillIds: ["void_pulse"]
        }
      },
      response
    );

    assert.equal(response.statusCode, 400);
    assert.match(output[0], /Rejected skill equip/);
    assert.match(output[0], /"requestId":"req-log-invalid-skill"/);
    assert.match(output[0], /"skillIds":\["void_pulse"\]/);
  } finally {
    console.warn = originalWarn;
  }
});
