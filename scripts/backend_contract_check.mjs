import { createGuestSession } from "../server/src/controllers/authController.js";
import { getContentBootstrap } from "../server/src/controllers/contentController.js";
import {
  claimPlayerDungeonReward,
  equipPlayerLoadoutSkills,
  getPlayerProfile,
  updatePlayerSession
} from "../server/src/controllers/playerController.js";
import {
  createSaveSlot,
  getSaveSlot,
  listSaveSlots,
  updateSaveSlot
} from "../server/src/controllers/saveController.js";
import { loginUserSession, registerUserSession } from "../server/src/controllers/authController.js";

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

async function runRequest(label, handler, request) {
  const response = createMockResponse();
  await handler(request, response);
  return {
    label,
    statusCode: response.statusCode,
    payload: response.payload
  };
}

const capturedLogs = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => capturedLogs.push(args.join(" "));
console.warn = (...args) => capturedLogs.push(args.join(" "));
console.error = (...args) => capturedLogs.push(args.join(" "));

const requests = [
  await runRequest("POST /auth/guest", createGuestSession, { id: "req-guest" }),
  await runRequest("GET /content/bootstrap", getContentBootstrap, { id: "req-bootstrap" }),
  await runRequest("GET /save-slots", listSaveSlots, { id: "req-slots" }),
  await runRequest("POST /save-slots invalid", createSaveSlot, {
    id: "req-invalid-slot",
    body: { archetypeId: "bad_type", label: "Broken" }
  }),
  await runRequest("POST /save-slots valid", createSaveSlot, {
    id: "req-create-slot",
    body: { archetypeId: "long_range", label: "Backend Contract" }
  })
];

const registerResponse = await runRequest("POST /auth/register", registerUserSession, {
  id: "req-backend-register",
  body: { username: "backendcontract", password: "secret12" }
});

const loginResponse = await runRequest("POST /auth/login", loginUserSession, {
  id: "req-backend-login",
  body: { username: "backendcontract", password: "secret12" }
});

const rewardAuthUser = loginResponse.payload?.data?.user;

const createdSlotId = requests[4].payload?.data?.id;

requests.push(
  await runRequest("PUT /save/:slotId", updateSaveSlot, {
    id: "req-update-slot",
    params: { slotId: createdSlotId },
    body: {
      playerState: {
        level: 4,
        xp: 18,
        pendingStatPoints: 3
      },
      sessionSummary: {
        enemiesRemaining: 0
      }
    }
  })
);

requests.push(
  await runRequest("GET /save/:slotId", getSaveSlot, {
    id: "req-get-slot",
    params: { slotId: createdSlotId }
  })
);

requests.push(
  await runRequest("PUT /save/missing", updateSaveSlot, {
    id: "req-missing-slot",
    params: { slotId: "slot-999" },
    body: {}
  })
);

requests.push(registerResponse);
requests.push(loginResponse);

requests.push(
  await runRequest("GET /player/profile", getPlayerProfile, {
    id: "req-backend-profile",
    authUser: rewardAuthUser
  })
);

requests.push(
  await runRequest("PUT /player/loadout/skills", equipPlayerLoadoutSkills, {
    id: "req-backend-equip-skills",
    authUser: rewardAuthUser,
    body: {
      skillIds: ["cleave_step", "iron_maelstrom", "cleave_step"]
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim shatter miniboss", claimPlayerDungeonReward, {
    id: "req-backend-shatter-miniboss",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "dungeon_miniboss",
      regionId: "shatter_dungeon"
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim veil miniboss", claimPlayerDungeonReward, {
    id: "req-backend-veil-miniboss",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "veil_miniboss",
      regionId: "hub_blacksite"
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim cinder miniboss", claimPlayerDungeonReward, {
    id: "req-backend-cinder-miniboss",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "cinder_miniboss",
      regionId: "cinder_dungeon"
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim shatter boss scroll invalid", claimPlayerDungeonReward, {
    id: "req-backend-shatter-scroll-invalid",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "shatter_boss_scroll",
      regionId: "shatter_boss_vault"
    }
  })
);

requests.push(
  await runRequest("PUT /player/session-state shatter boss cleared", updatePlayerSession, {
    id: "req-backend-shatter-boss-cleared",
    authUser: rewardAuthUser,
    body: {
      regionId: "shatter_boss_vault",
      sessionState: {
        clearedBossRegionId: "shatter_boss_vault"
      }
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim shatter boss scroll", claimPlayerDungeonReward, {
    id: "req-backend-shatter-scroll",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "shatter_boss_scroll",
      regionId: "shatter_boss_vault"
    }
  })
);

requests.push(
  await runRequest("PUT /player/session-state veil boss uncleared", updatePlayerSession, {
    id: "req-backend-veil-boss-uncleared",
    authUser: rewardAuthUser,
    body: {
      regionId: "veil_boss_vault",
      sessionState: {
        clearedBossRegionId: "shatter_boss_vault"
      }
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim veil boss scroll", claimPlayerDungeonReward, {
    id: "req-backend-veil-scroll",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "veil_boss_scroll",
      regionId: "veil_boss_vault"
    }
  })
);

requests.push(
  await runRequest("PUT /player/session-state night boss cleared", updatePlayerSession, {
    id: "req-backend-night-boss-cleared",
    authUser: rewardAuthUser,
    body: {
      regionId: "night_boss_vault",
      sessionState: {
        clearedBossRegionId: "night_boss_vault"
      }
    }
  })
);

requests.push(
  await runRequest("POST /player/rewards/claim night boss scroll", claimPlayerDungeonReward, {
    id: "req-backend-night-scroll",
    authUser: rewardAuthUser,
    body: {
      rewardSource: "night_boss_scroll",
      regionId: "night_boss_vault"
    }
  })
);

console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

const analysis = requests.map((entry) => {
  let expectation = "OK";

  if (entry.label === "POST /save-slots invalid") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "POST /save-slots valid") {
    expectation =
      entry.payload?.data?.playerState?.ce === 96 &&
      entry.payload?.data?.playerState?.attack === 11
        ? "OK"
        : "BUG";
  }

  if (entry.label === "GET /save/:slotId") {
    expectation =
      entry.payload?.data?.playerState?.level === 4 &&
      !("stats" in entry.payload.data)
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /auth/login") {
    expectation = entry.payload?.data?.token ? "OK" : "BUG";
  }

  if (entry.label === "GET /player/profile") {
    expectation = entry.payload?.data?.equippedSkills?.length === 2 ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/loadout/skills") {
    expectation =
      entry.payload?.data?.equippedSkills?.map((skill) => skill.id).join(",") ===
      "cleave_step,iron_maelstrom"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil miniboss") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim shatter miniboss") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim cinder miniboss") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil boss scroll") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim shatter boss scroll invalid") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim shatter boss scroll") {
    expectation =
      entry.statusCode === 200 &&
      entry.payload?.data?.reward?.type === "scroll" &&
      (entry.payload?.data?.bonusRewards?.length ?? 0) <= 2
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim night boss scroll") {
    expectation =
      entry.statusCode === 200 &&
      entry.payload?.data?.reward?.type === "scroll" &&
      entry.payload?.data?.bonusRewards?.length === 2
        ? "OK"
        : "BUG";
  }

  return {
    ...entry,
    expectation
  };
});

process.stdout.write(
  JSON.stringify(
    {
      analysis,
      logs: capturedLogs
    },
    null,
    2
  )
);
