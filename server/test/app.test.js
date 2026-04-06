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
  equipPlayerInventoryItem,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
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

  const rewardResponse = createMockResponse();
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
    rewardResponse
  );
  assert.equal(rewardResponse.statusCode, 200);
  assert.equal(rewardResponse.payload.data.level, 3);
  assert.equal(rewardResponse.payload.data.xp, 15);
  assert.equal(rewardResponse.payload.data.pendingStatPoints, 1);
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
