import {
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../server/src/controllers/authController.js";
import {
  applyPlayerCombatProgression,
  equipPlayerInventoryItem,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
  updatePlayerSession,
  updatePlayerClass
} from "../server/src/controllers/playerController.js";
import { createSaveSlot, listSaveSlots } from "../server/src/controllers/saveController.js";

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

async function runStep(label, handler, request) {
  const response = createMockResponse();
  const startedAt = performance.now();
  await handler(request, response);
  const durationMs = Number((performance.now() - startedAt).toFixed(3));

  return {
    label,
    statusCode: response.statusCode,
    durationMs,
    payload: response.payload
  };
}

const logs = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => logs.push(args.join(" "));
console.warn = (...args) => logs.push(args.join(" "));
console.error = (...args) => logs.push(args.join(" "));

const results = [];

results.push(
  await runStep("GET /auth/me unauthorized", getCurrentSession, {
    headers: {}
  })
);

results.push(
  await runStep("GET /player/profile unauthorized", getPlayerProfile, {
    authUser: null
  })
);

results.push(
  await runStep("POST /auth/register", registerUserSession, {
    id: "req-register-contract",
    body: {
      username: "contractplayer",
      password: "secret12"
    }
  })
);

results.push(
  await runStep("POST /auth/login", loginUserSession, {
    id: "req-login-contract",
    body: {
      username: "contractplayer",
      password: "secret12"
    }
  })
);

const token = results.at(-1).payload?.data?.token;
const authUser = results.at(-1).payload?.data?.user;

results.push(
  await runStep("GET /auth/me authorized", getCurrentSession, {
    headers: {
      authorization: `Bearer ${token}`
    }
  })
);

results.push(
  await runStep("GET /player/profile", getPlayerProfile, {
    authUser
  })
);

results.push(
  await runStep("PUT /player/profile/class", updatePlayerClass, {
    id: "req-class-contract",
    authUser,
    body: {
      classType: "long_range"
    }
  })
);

results.push(
  await runStep("PUT /player/loadout/item", equipPlayerInventoryItem, {
    id: "req-equip-item-contract",
    authUser,
    body: {
      itemId: "ritual_focus"
    }
  })
);

results.push(
  await runStep("PUT /player/loadout/skills", equipPlayerLoadoutSkills, {
    id: "req-equip-skills-contract",
    authUser,
    body: {
      skillIds: ["shard_arc", "starfall_lance"]
    }
  })
);

results.push(
  await runStep("PUT /player/progression/reward", applyPlayerCombatProgression, {
    id: "req-progression-reward-contract",
    authUser,
    body: {
      level: 1,
      xp: 25,
      pendingStatPoints: 0,
      xpGained: 10,
      source: "combat"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state", updatePlayerSession, {
    id: "req-session-state-contract",
    authUser,
    body: {
      regionId: "shatter_dungeon",
      sessionState: {
        explorationBonus: {
          label: "Technique resonance",
          ceBonus: 18
        },
        dungeonRelicClaimed: true
      }
    }
  })
);

results.push(
  await runStep("GET /save-slots authorized before create", listSaveSlots, {
    authUser
  })
);

results.push(
  await runStep("POST /save-slots authorized", createSaveSlot, {
    id: "req-save-create-contract",
    authUser,
    body: {
      label: "Auth Owned Slot",
      archetypeId: "long_range"
    }
  })
);

results.push(
  await runStep("GET /save-slots authorized after create", listSaveSlots, {
    authUser
  })
);

results.push(
  await runStep("GET /save-slots guest visibility", listSaveSlots, {
    authUser: null
  })
);

console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

const assertions = results.map((entry) => {
  let expectation = "OK";

  if (entry.label.includes("unauthorized")) {
    expectation = entry.statusCode === 401 ? "OK" : "BUG";
  }

  if (entry.label === "POST /auth/login") {
    expectation = entry.payload?.data?.token ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/profile/class") {
    expectation = entry.payload?.data?.classType === "long_range" ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/loadout/item") {
    expectation =
      entry.payload?.data?.equippedItems?.some((item) => item.id === "ritual_focus") ? "OK" : "BUG";
  }

  if (entry.label === "GET /save-slots authorized before create") {
    expectation = entry.payload?.data?.length === 0 ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/progression/reward") {
    expectation =
      entry.payload?.data?.level === 2 && entry.payload?.data?.pendingStatPoints === 1
        ? "OK"
        : "BUG";
  }

  if (entry.label === "PUT /player/session-state") {
    expectation =
      entry.payload?.data?.currentRegionId === "shatter_dungeon" &&
      entry.payload?.data?.sessionState?.dungeonRelicClaimed === true
        ? "OK"
        : "BUG";
  }

  if (entry.label === "GET /save-slots authorized after create") {
    expectation =
      entry.payload?.data?.length === 1 && entry.payload.data[0].label === "Auth Owned Slot"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "GET /save-slots guest visibility") {
    expectation =
      entry.payload?.data?.every((slot) => slot.label !== "Auth Owned Slot") ? "OK" : "BUG";
  }

  return {
    ...entry,
    expectation
  };
});

process.stdout.write(
  JSON.stringify(
    {
      assertions,
      logs
    },
    null,
    2
  )
);
