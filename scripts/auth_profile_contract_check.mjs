import {
  getCurrentSession,
  loginUserSession,
  registerUserSession
} from "../server/src/controllers/authController.js";
import {
  applyPlayerCombatProgression,
  claimPlayerDungeonReward,
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
      skillIds: ["shard_arc", "starfall_lance", "shard_arc"]
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
  await runStep("POST /player/rewards/claim first invalid context", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-0-invalid",
    authUser,
    body: {
      rewardSource: "dungeon_miniboss",
      regionId: "shatter_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state", updatePlayerSession, {
    id: "req-session-state-contract",
    authUser,
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
  })
);

results.push(
  await runStep("POST /player/rewards/claim first", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-1",
    authUser,
    body: {
      rewardSource: "dungeon_miniboss",
      regionId: "shatter_dungeon"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim duplicate", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-2",
    authUser,
    body: {
      rewardSource: "dungeon_miniboss",
      regionId: "shatter_dungeon"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil miniboss invalid context", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-veil-miniboss-invalid",
    authUser,
    body: {
      rewardSource: "veil_miniboss",
      regionId: "shatter_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state veil dungeon", updatePlayerSession, {
    id: "req-session-state-veil-dungeon",
    authUser,
    body: {
      regionId: "veil_dungeon",
      sessionState: {
        dungeonRelicClaimedRegionId: "shatter_dungeon"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil miniboss relic mismatch", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-veil-miniboss-mismatch",
    authUser,
    body: {
      rewardSource: "veil_miniboss",
      regionId: "veil_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state veil dungeon cleared", updatePlayerSession, {
    id: "req-session-state-veil-dungeon-cleared",
    authUser,
    body: {
      regionId: "veil_dungeon",
      sessionState: {
        dungeonRelicClaimed: true,
        dungeonRelicClaimedRegionId: "veil_dungeon"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil miniboss", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-veil-miniboss",
    authUser,
    body: {
      rewardSource: "veil_miniboss",
      regionId: "veil_dungeon"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil miniboss duplicate", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-veil-miniboss-duplicate",
    authUser,
    body: {
      rewardSource: "veil_miniboss",
      regionId: "veil_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state cinder dungeon mismatch", updatePlayerSession, {
    id: "req-session-state-cinder-dungeon-mismatch",
    authUser,
    body: {
      regionId: "cinder_dungeon",
      sessionState: {
        dungeonRelicClaimedRegionId: "veil_dungeon"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder miniboss relic mismatch", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-miniboss-mismatch",
    authUser,
    body: {
      rewardSource: "cinder_miniboss",
      regionId: "cinder_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state cinder dungeon cleared", updatePlayerSession, {
    id: "req-session-state-cinder-dungeon-cleared",
    authUser,
    body: {
      regionId: "cinder_dungeon",
      sessionState: {
        dungeonRelicClaimed: true,
        dungeonRelicClaimedRegionId: "cinder_dungeon"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder miniboss", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-miniboss",
    authUser,
    body: {
      rewardSource: "cinder_miniboss",
      regionId: "cinder_dungeon"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder miniboss duplicate", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-miniboss-duplicate",
    authUser,
    body: {
      rewardSource: "cinder_miniboss",
      regionId: "cinder_dungeon"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state veil boss", updatePlayerSession, {
    id: "req-session-state-veil-boss",
    authUser,
    body: {
      regionId: "veil_boss_vault",
      sessionState: {
        clearedBossRegionId: "shatter_boss_vault"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil boss scroll invalid context", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-3-invalid",
    authUser,
    body: {
      rewardSource: "veil_boss_scroll",
      regionId: "veil_boss_vault"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state veil boss cleared", updatePlayerSession, {
    id: "req-session-state-veil-boss-cleared",
    authUser,
    body: {
      regionId: "veil_boss_vault",
      sessionState: {
        clearedBossRegionId: "veil_boss_vault"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil boss scroll", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-3",
    authUser,
    body: {
      rewardSource: "veil_boss_scroll",
      regionId: "veil_boss_vault"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim veil boss scroll duplicate", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-4",
    authUser,
    body: {
      rewardSource: "veil_boss_scroll",
      regionId: "veil_boss_vault"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder boss reward invalid", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-boss-invalid",
    authUser,
    body: {
      rewardSource: "cinder_boss_core",
      regionId: "cinder_boss_vault"
    }
  })
);

results.push(
  await runStep("PUT /player/session-state cinder boss cleared", updatePlayerSession, {
    id: "req-session-state-cinder-boss-cleared",
    authUser,
    body: {
      regionId: "cinder_boss_vault",
      sessionState: {
        clearedBossRegionId: "cinder_boss_vault"
      }
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder boss reward", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-boss",
    authUser,
    body: {
      rewardSource: "cinder_boss_core",
      regionId: "cinder_boss_vault"
    }
  })
);

results.push(
  await runStep("POST /player/rewards/claim cinder boss reward duplicate", claimPlayerDungeonReward, {
    id: "req-reward-claim-contract-cinder-boss-duplicate",
    authUser,
    body: {
      rewardSource: "cinder_boss_core",
      regionId: "cinder_boss_vault"
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

  if (entry.label === "POST /player/rewards/claim cinder miniboss relic mismatch") {
    expectation =
      entry.statusCode === 400 && entry.payload?.error === "Invalid reward context" ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim cinder miniboss") {
    expectation =
      entry.statusCode === 200 &&
      entry.payload?.data?.reward?.rarity === "epic" &&
      entry.payload?.data?.bonusRewards?.length === 2
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim cinder miniboss duplicate") {
    expectation = entry.statusCode === 200 && entry.payload?.data?.reward === null ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim first") {
    expectation =
      entry.statusCode === 200 &&
      Boolean(entry.payload?.data?.reward?.id) &&
      entry.payload?.data?.bonusRewards?.length === 2
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil boss scroll") {
    expectation =
      entry.statusCode === 200 &&
      entry.payload?.data?.reward?.type === "scroll" &&
      (entry.payload?.data?.bonusRewards?.length ?? 0) <= 1
        ? "OK"
        : "BUG";
  }

  if (entry.label === "PUT /player/loadout/item") {
    expectation =
      entry.payload?.data?.equippedItems?.some((item) => item.id === "ritual_focus") ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/loadout/skills") {
    expectation =
      entry.payload?.data?.equippedSkills?.map((skill) => skill.id).join(",") ===
      "shard_arc,starfall_lance"
        ? "OK"
        : "BUG";
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
      Array.isArray(entry.payload?.data?.unlockedRegionIds) &&
      entry.payload.data.unlockedRegionIds.includes("veil_shrine") &&
      entry.payload?.data?.sessionState?.dungeonRelicClaimed === true &&
      entry.payload?.data?.sessionState?.dungeonRelicClaimedRegionId === "shatter_dungeon"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim first invalid context") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "PUT /player/session-state veil dungeon") {
    expectation =
      entry.payload?.data?.currentRegionId === "veil_dungeon" &&
      entry.payload?.data?.sessionState?.dungeonRelicClaimedRegionId === "shatter_dungeon"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "PUT /player/session-state veil dungeon cleared") {
    expectation =
      entry.payload?.data?.currentRegionId === "veil_dungeon" &&
      entry.payload?.data?.sessionState?.dungeonRelicClaimedRegionId === "veil_dungeon"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "PUT /player/session-state veil boss") {
    expectation =
      entry.payload?.data?.currentRegionId === "veil_boss_vault" &&
      entry.payload?.data?.sessionState?.clearedBossRegionId === "shatter_boss_vault"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "PUT /player/session-state veil boss cleared") {
    expectation =
      entry.payload?.data?.currentRegionId === "veil_boss_vault" &&
      entry.payload?.data?.sessionState?.clearedBossRegionId === "veil_boss_vault"
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim first") {
    expectation = entry.payload?.data?.reward?.id ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim duplicate") {
    expectation =
      entry.payload?.data?.reward === null &&
      entry.payload?.data?.profile?.inventoryItems?.length > 0
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil miniboss") {
    expectation =
      entry.payload?.data?.reward?.rarity === "epic" &&
      entry.payload?.data?.profile?.inventoryItems?.some(
        (item) => item.id === entry.payload?.data?.reward?.id
      )
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil miniboss invalid context") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil miniboss relic mismatch") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil miniboss duplicate") {
    expectation =
      entry.payload?.data?.reward === null &&
      entry.payload?.data?.profile?.inventoryItems?.some((item) => item.id === "astral_prism")
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil boss scroll") {
    expectation =
      entry.payload?.data?.reward?.type === "scroll" &&
      entry.payload?.data?.profile?.availableSkills?.some(
        (skill) => skill.id === entry.payload?.data?.reward?.id
      )
        ? "OK"
        : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil boss scroll invalid context") {
    expectation = entry.statusCode === 400 ? "OK" : "BUG";
  }

  if (entry.label === "POST /player/rewards/claim veil boss scroll duplicate") {
    expectation =
      entry.payload?.data?.reward === null &&
      entry.payload?.data?.profile?.availableSkills?.some((skill) => skill.id === "void_pulse")
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
