import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const rootDir = process.cwd();
const webDistIndex = path.join(rootDir, "web", "dist", "index.html");
const webDistDir = path.join(rootDir, "web", "dist");
const serverUrl = "http://localhost:4000/health";
const webUrl = "http://localhost:5173";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function spawnManagedProcess(command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      HOST: "127.0.0.1"
    }
  });

  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  return { child, logs };
}

async function waitForHttp(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Wait until ready.
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopManagedProcess(processHandle) {
  if (!processHandle || processHandle.child.killed) {
    return;
  }

  processHandle.child.kill("SIGTERM");
  await new Promise((resolve) => {
    processHandle.child.once("exit", resolve);
    setTimeout(() => {
      if (!processHandle.child.killed) {
        processHandle.child.kill("SIGKILL");
      }
      resolve();
    }, 2000);
  });
}

function createStaticServer() {
  const server = http.createServer((request, response) => {
    const requestPath = request.url === "/" ? "/index.html" : request.url ?? "/index.html";
    const sanitizedPath = requestPath.split("?")[0];
    const targetPath = path.join(webDistDir, sanitizedPath);
    const resolvedPath = targetPath.startsWith(webDistDir) ? targetPath : webDistIndex;
    const finalPath = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()
      ? resolvedPath
      : webDistIndex;
    const extension = path.extname(finalPath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] ?? "text/plain; charset=utf-8"
    });
    response.end(fs.readFileSync(finalPath));
  });

  return server;
}

async function run() {
  assert(fs.existsSync(webDistIndex), "Missing built web assets. Run `npm run build` before browser flow checks.");

  const server = spawnManagedProcess("npm", ["run", "start", "-w", "server"]);
  const staticServer = createStaticServer();
  let browser = null;
  let context = null;
  let page = null;
  const pageLogs = [];

  try {
    await new Promise((resolve, reject) => {
      staticServer.once("error", reject);
      staticServer.listen(5173, "localhost", resolve);
    });
    await waitForHttp(serverUrl);
    await waitForHttp(webUrl);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    page.on("console", (message) => {
      pageLogs.push(`${message.type()}: ${message.text()}`);
    });
    const metrics = {};

    await page.goto(webUrl, { waitUntil: "networkidle" });
    await page.getByText("Apex Clash").waitFor();
    await page.getByText("Player Access").waitFor();
    await page.getByRole("heading", { name: "Play Surface" }).waitFor();
    await page.locator(".game-canvas").waitFor();
    await page.getByText("Save Slots").waitFor();
    metrics.shellReady = true;

    const loginStartedAt = Date.now();
    await page.getByPlaceholder("username").fill("admin");
    await page.getByPlaceholder("password").fill("admin");
    await page.getByRole("button", { name: "Login" }).click();
    await page.getByRole("button", { name: "Logout" }).waitFor();
    metrics.loginMs = Date.now() - loginStartedAt;

    await page.getByText("Live Profile Resume").waitFor();
    await page.getByText(/Resume mode: save snapshot \(slot-/).waitFor();
    metrics.snapshotResumeVisible = true;

    const transitionStartedAt = Date.now();
    await page.getByRole("button", { name: "Shatter Block", exact: true }).click();
    await page.getByRole("button", { name: /Deploy To Shatter Block/ }).click();
    await page.getByText("Scene: Region").waitFor();
    metrics.transitionToRegionMs = Date.now() - transitionStartedAt;

    await page.getByText("Probe the route").waitFor();
    await page.getByText("Search the area, secure a boon, and enter the dungeon ingress.").waitFor();
    const boonStartedAt = Date.now();
    await page.getByRole("button", { name: "Secure Boon" }).click();
    await page.getByText("Move to the gate and press E").waitFor();
    metrics.claimBoonMs = Date.now() - boonStartedAt;

    const dungeonStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Dungeon" }).click();
    await page.getByText("Scene: Dungeon").waitFor();
    metrics.transitionToDungeonMs = Date.now() - dungeonStartedAt;

    const relicStartedAt = Date.now();
    await page.getByRole("button", { name: "Claim Relic" }).click();
    await page.getByText("Miniboss chamber", { exact: true }).waitFor();
    await delay(250);
    metrics.claimRelicMs = Date.now() - relicStartedAt;

    const minibossStartedAt = Date.now();
    const minibossTimeout = Date.now() + 15000;
    while (Date.now() < minibossTimeout) {
      const bossVaultOpen = await page.getByText("Boss vault ready").isVisible().catch(() => false);
      if (bossVaultOpen) {
        break;
      }

      await page.getByRole("button", { name: "Strike Sentinel" }).click();
      await delay(250);
    }
    await page.getByText("Boss vault ready", { exact: true }).waitFor();
    metrics.minibossClearMs = Date.now() - minibossStartedAt;

    const bossStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Boss Vault" }).click();
    await page.getByText("Scene: Boss Vault").waitFor();
    metrics.transitionToBossMs = Date.now() - bossStartedAt;

    const bossClearStartedAt = Date.now();
    const bossTimeout = Date.now() + 25000;
    while (Date.now() < bossTimeout) {
      const extractReady = await page.getByText("Extract with the clear").isVisible().catch(() => false);
      if (extractReady) {
        break;
      }

      await page.getByRole("button", { name: "Strike Boss" }).click();
      await delay(300);
    }
    await page.getByText("Extract with the clear").waitFor();
    metrics.bossClearMs = Date.now() - bossClearStartedAt;

    const extractStartedAt = Date.now();
    await page.getByRole("button", { name: "Extract" }).click();
    await page.getByText("Scene: Hub").waitFor();
    await page.getByRole("button", { name: "Veil Shrine", exact: true }).waitFor();
    metrics.extractToHubMs = Date.now() - extractStartedAt;

    const tutorialComplete = await page.evaluate(() =>
      window.localStorage.getItem("apex-clash:first-run-complete")
    );
    metrics.firstRunTutorialComplete = tutorialComplete === "true";

    const createSlotStartedAt = Date.now();
    await page.getByRole("button", { name: "New" }).click();
    await page.getByText("Save status: slot created").waitFor();
    metrics.createSlotMs = Date.now() - createSlotStartedAt;

    await page.getByText("Live Profile Resume").click();
    await page.getByText("Resume mode: live profile session").waitFor();
    metrics.liveResumeToggleWorks = true;
    metrics.liveResumeVisible = true;

    const syncStartedAt = Date.now();
    await page.getByRole("button", { name: "Sync Current Run" }).click();
    await page.getByText("Save status: synced").waitFor();
    metrics.manualSyncMs = Date.now() - syncStartedAt;

    assert(metrics.shellReady, "Initial browser shell was not ready.");
    assert(metrics.liveResumeVisible, "Live profile resume state was not visible.");
    assert(metrics.snapshotResumeVisible, "Snapshot resume state was not visible after slot creation.");
    assert(metrics.liveResumeToggleWorks, "Resume toggle did not return to live profile mode.");
    assert(metrics.firstRunTutorialComplete, "First-run tutorial completion flag was not persisted.");

    await browser.close();
    browser = null;
    process.stdout.write(`${JSON.stringify({ status: "passed", metrics }, null, 2)}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: "failed",
          error: error.message,
          bodyText: page ? await page.locator("body").innerText().catch(() => "") : "",
          pageLogs: pageLogs.slice(-10),
          serverLogs: server.logs.slice(-10),
          webLogs: ["static server"],
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await new Promise((resolve) => staticServer.close(resolve));
    await stopManagedProcess(server);
  }
}

await run();
