import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = process.cwd();
const port = Number(process.env.MONGO_RUNTIME_PORT ?? 4100);
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

  throw new Error("Timed out waiting for Mongo-backed server health.");
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

async function run() {
  const server = spawnServer();
  const username = `mongo_probe_${Date.now()}`;
  let health = null;
  let initialProfile = null;
  let sessionProfile = null;
  let persistedProfile = null;
  let saveSlot = null;
  let saveSlots = [];

  try {
    health = await waitForHealth();
    assert(health.persistence?.mongoConnected, "Server did not report active Mongo persistence.");

    await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        password: "secret12"
      })
    });

    const login = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password: "secret12"
      })
    });

    const token = login.token;
    const authHeaders = {
      Authorization: `Bearer ${token}`
    };

    initialProfile = await request("/player/profile", {
      headers: authHeaders
    });

    sessionProfile = await request("/player/session-state", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        regionId: "barrier_shrine",
        unlockedRegionIds: ["barrier_shrine"],
        sessionState: {
          clearedBossRegionId: "detention_center_boss_vault"
        }
      })
    });

    saveSlot = await request("/save-slots", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        archetypeId: "striker",
        label: "Mongo Runtime Probe"
      })
    });

    saveSlots = await request("/save-slots", {
      headers: authHeaders
    });

    persistedProfile = await request("/player/profile", {
      headers: authHeaders
    });

    assert(initialProfile.currentRegionId === "hub_blacksite", "Initial profile did not start at hub.");
    assert(sessionProfile.currentRegionId === "barrier_shrine", "Session update did not persist region.");
    assert(
      sessionProfile.clearedRegionIds?.includes("detention_center"),
      "Session update did not derive Shatter clear into the Mongo-backed profile."
    );
    assert(
      saveSlots.some((entry) => entry.id === saveSlot.id),
      "Mongo-backed save slot was not returned in the follow-up listing."
    );
    assert(
      persistedProfile.currentRegionId === "barrier_shrine",
      "Persisted profile fetch did not reflect the Mongo-backed session update."
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          status: "passed",
          metrics: {
            persistenceMode: health.persistence.mode,
            mongoConnected: health.persistence.mongoConnected,
            regionPersisted: persistedProfile.currentRegionId,
            clearedRouteCount: persistedProfile.clearedRegionIds?.length ?? 0,
            saveSlotId: saveSlot.id,
            saveSlotCount: saveSlots.length
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
          health,
          initialProfile,
          sessionProfile,
          persistedProfile,
          saveSlot,
          saveSlots,
          serverLogs: server.logs.slice(-20),
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
