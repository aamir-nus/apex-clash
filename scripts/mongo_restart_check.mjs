import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = process.cwd();
const port = Number(process.env.MONGO_RESTART_PORT ?? 4101);
const mongodbUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/apex-clash";
const baseUrl = `http://127.0.0.1:${port}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function spawnServer() {
  const child = spawn("npm", ["run", "start", "-w", "server"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      MONGODB_URI: mongodbUri
    }
  });

  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  return { child, logs };
}

async function stopServer(server) {
  if (!server?.child || server.child.killed) {
    return;
  }

  server.child.kill("SIGTERM");
  await new Promise((resolve) => {
    server.child.once("exit", resolve);
    setTimeout(() => {
      if (!server.child.killed) {
        server.child.kill("SIGKILL");
      }
      resolve();
    }, 2000);
  });
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // wait for server
    }

    await delay(250);
  }

  throw new Error("Timed out waiting for restarted Mongo-backed server health.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${payload.error ?? response.status}`);
  }

  return payload.data;
}

async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

async function run() {
  const username = `mongo_restart_${Date.now()}`;
  const password = "secret12";
  let server = spawnServer();
  let firstHealth = null;
  let secondHealth = null;
  let initialProfile = null;
  let restartedProfile = null;
  let restartedSaveSlots = [];
  let createdSaveSlot = null;
  let serverLogs = [];

  try {
    firstHealth = await waitForHealth();
    assert(firstHealth.persistence?.mongoConnected, "Initial server did not report active Mongo persistence.");

    await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    const initialLogin = await login(username, password);
    const initialHeaders = {
      Authorization: `Bearer ${initialLogin.token}`
    };

    await request("/player/session-state", {
      method: "PUT",
      headers: initialHeaders,
      body: JSON.stringify({
        regionId: "veil_shrine",
        unlockedRegionIds: ["veil_shrine"],
        sessionState: {
          clearedBossRegionId: "shatter_boss_vault"
        }
      })
    });

    createdSaveSlot = await request("/save-slots", {
      method: "POST",
      headers: initialHeaders,
      body: JSON.stringify({
        archetypeId: "close_combat",
        label: "Mongo Restart Probe"
      })
    });

    initialProfile = await request("/player/profile", {
      headers: initialHeaders
    });

    serverLogs = server.logs;
    await stopServer(server);
    server = spawnServer();

    secondHealth = await waitForHealth();
    assert(secondHealth.persistence?.mongoConnected, "Restarted server did not report active Mongo persistence.");

    const restartedLogin = await login(username, password);
    const restartedHeaders = {
      Authorization: `Bearer ${restartedLogin.token}`
    };

    restartedProfile = await request("/player/profile", {
      headers: restartedHeaders
    });
    restartedSaveSlots = await request("/save-slots", {
      headers: restartedHeaders
    });

    assert(initialProfile.currentRegionId === "veil_shrine", "Initial Mongo-backed profile did not persist the route state before restart.");
    assert(restartedProfile.currentRegionId === "veil_shrine", "Restarted profile did not persist the route state.");
    assert(
      restartedProfile.clearedRegionIds?.includes("shatter_block"),
      "Restarted profile did not retain cleared-route progression."
    );
    assert(
      restartedSaveSlots.some((entry) => entry.id === createdSaveSlot.id),
      "Restarted server did not return the Mongo-backed save slot."
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          status: "passed",
          metrics: {
            firstPersistenceMode: firstHealth.persistence.mode,
            secondPersistenceMode: secondHealth.persistence.mode,
            restartedRegion: restartedProfile.currentRegionId,
            restartedClearedRouteCount: restartedProfile.clearedRegionIds?.length ?? 0,
            restartedSaveSlotCount: restartedSaveSlots.length
          }
        },
        null,
        2
      )}\n`
    );
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "failed",
          error: error.message,
          firstHealth,
          secondHealth,
          initialProfile,
          restartedProfile,
          createdSaveSlot,
          restartedSaveSlots,
          serverLogs: [...serverLogs, ...(server?.logs ?? [])].slice(-30),
          mongodbUri
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  } finally {
    await stopServer(server);
  }
}

await run();
