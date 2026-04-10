import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = process.cwd();
const apiBaseUrl = "http://127.0.0.1:4000";
const webBaseUrl = "http://127.0.0.1:8080";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `docker compose ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function waitForJson(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // wait for service
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForText(url, pattern, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (response.ok && pattern.test(text)) {
        return text;
      }
    } catch {
      // wait for service
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url} to match ${pattern}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
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
  const username = `docker_probe_${Date.now()}`;
  const password = "secret12";
  let composeLogs = "";

  try {
    const build = await runCommand(["up", "-d", "--build"]);
    composeLogs += build.stdout + build.stderr;

    const health = await waitForJson(`${apiBaseUrl}/health`);
    const html = await waitForText(webBaseUrl, /Apex Clash/i);

    assert(health.persistence?.mode === "mongo", "Docker API did not report Mongo persistence.");

    await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    const login = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    const authHeaders = {
      Authorization: `Bearer ${login.token}`
    };

    const sessionProfile = await request("/player/session-state", {
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

    const saveSlot = await request("/save-slots", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        archetypeId: "striker",
        label: "Docker Deploy Probe"
      })
    });

    const persistedProfile = await request("/player/profile", {
      headers: authHeaders
    });
    const saveSlots = await request("/save-slots", {
      headers: authHeaders
    });

    assert(/Apex Clash/i.test(html), "Docker web surface did not serve the app shell.");
    assert(sessionProfile.currentRegionId === "barrier_shrine", "Docker API did not persist the profile region.");
    assert(
      persistedProfile.clearedRegionIds?.includes("detention_center"),
      "Docker API did not persist cleared-route progression."
    );
    assert(
      saveSlots.some((entry) => entry.id === saveSlot.id),
      "Docker API did not return the created save slot."
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          status: "passed",
          metrics: {
            persistenceMode: health.persistence.mode,
            mongoConnected: health.persistence.mongoConnected,
            servedWeb: true,
            regionPersisted: persistedProfile.currentRegionId,
            clearedRouteCount: persistedProfile.clearedRegionIds?.length ?? 0,
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
          composeLogs
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  } finally {
    await runCommand(["down"]).catch(() => {});
  }
}

await run();
