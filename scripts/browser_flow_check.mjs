import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const rootDir = process.cwd();
const webDistIndex = path.join(rootDir, "web", "dist", "index.html");
const webDistDir = path.join(rootDir, "web", "dist");
const managedMode = process.env.BROWSER_FLOW_MODE ?? "managed";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function routeStatus(page, text) {
  return page.locator(".route-status-pill", { hasText: text });
}

function objectiveBanner(page) {
  return page.locator(".objective-banner");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function spawnManagedProcess(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      ...extraEnv
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
  if (managedMode === "managed") {
    assert(fs.existsSync(webDistIndex), "Missing built web assets. Run `npm run build` before browser flow checks.");
  }

  const managedWebPort = managedMode === "managed"
    ? Number(process.env.BROWSER_FLOW_MANAGED_WEB_PORT ?? 5173)
    : null;
  const apiBaseUrl =
    process.env.BROWSER_FLOW_API_BASE_URL ??
    "http://localhost:4000";
  const webUrl =
    process.env.BROWSER_FLOW_WEB_URL ??
    (managedMode === "managed" ? `http://localhost:${managedWebPort}` : "http://localhost:5173");
  const serverUrl = `${apiBaseUrl}/health`;

  const server = managedMode === "managed"
    ? spawnManagedProcess("npm", ["run", "start", "-w", "server"], {
        CLIENT_ORIGIN: webUrl
      })
    : null;
  const staticServer = managedMode === "managed" ? createStaticServer() : null;
  let browser = null;
  let context = null;
  let page = null;
  const pageLogs = [];
  const testUser = {
    username: `flow_${Date.now()}`,
    password: "flowpass"
  };

  try {
    if (staticServer) {
      await new Promise((resolve, reject) => {
        staticServer.once("error", reject);
        staticServer.listen(managedWebPort, "127.0.0.1", resolve);
      });
    }
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
    await page.getByRole("button", { name: "Need an account?" }).click();
    await page.getByPlaceholder("username").fill(testUser.username);
    await page.getByPlaceholder("password").fill(testUser.password);
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await page.getByText("Registered. Log in to bind your save slots.").waitFor();
    await page.getByPlaceholder("username").fill(testUser.username);
    await page.getByPlaceholder("password").fill(testUser.password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByRole("button", { name: "Logout" }).waitFor();
    metrics.loginMs = Date.now() - loginStartedAt;

    await page.getByText("Live Profile Resume").waitFor();
    await page.getByText("Resume mode").waitFor();
    await page.getByText("live profile session").waitFor();
    metrics.liveResumeDefault = true;

    const transitionStartedAt = Date.now();
    await page.getByRole("button", { name: "Detention Center", exact: true }).click();
    await page.getByRole("button", { name: /Deploy To Detention Center/ }).click();
    await page.getByText("Scene: Region").waitFor();
    metrics.transitionToRegionMs = Date.now() - transitionStartedAt;

    await objectiveBanner(page).getByText("Probe the route").waitFor();
    await objectiveBanner(page).getByText(/Search the area, secure a boon, and enter/i).waitFor();
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
    await routeStatus(page, "Miniboss chamber").waitFor();
    await delay(250);
    metrics.claimRelicMs = Date.now() - relicStartedAt;

    const minibossStartedAt = Date.now();
    const minibossTimeout = Date.now() + 15000;
    while (Date.now() < minibossTimeout) {
      const bossVaultOpen = await routeStatus(page, "Boss vault ready").isVisible().catch(() => false);
      if (bossVaultOpen) {
        break;
      }

      await page.getByRole("button", { name: "Strike Sentinel" }).click();
      await delay(250);
    }
    await routeStatus(page, "Boss vault ready").waitFor();
    metrics.minibossClearMs = Date.now() - minibossStartedAt;

    const bossStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Boss Vault" }).click();
    await page.getByText("Scene: Boss Vault").waitFor();
    metrics.transitionToBossMs = Date.now() - bossStartedAt;

    const bossClearStartedAt = Date.now();
    const bossTimeout = Date.now() + 25000;
    while (Date.now() < bossTimeout) {
      const extractReady = await objectiveBanner(page).getByText("Extract with the clear").isVisible().catch(() => false);
      if (extractReady) {
        break;
      }

      await page.getByRole("button", { name: "Strike Boss" }).click();
      await delay(300);
    }
    await objectiveBanner(page).getByText("Extract with the clear").waitFor();
    metrics.bossClearMs = Date.now() - bossClearStartedAt;

    const extractStartedAt = Date.now();
    await page.getByRole("button", { name: "Extract" }).click();
    await page.getByText("Scene: Hub").waitFor();
    await page.getByRole("button", { name: "Barrier Shrine", exact: true }).waitFor();
    metrics.extractToHubMs = Date.now() - extractStartedAt;

    const veilDeployStartedAt = Date.now();
    await page.getByRole("button", { name: "Barrier Shrine", exact: true }).click();
    await page.getByRole("button", { name: /Deploy To Barrier Shrine/ }).click();
    await page.getByText("Scene: Region").waitFor();
    await page.getByText("Route pressure: barrier descent").waitFor();
    metrics.transitionToVeilRegionMs = Date.now() - veilDeployStartedAt;

    const veilBoonStartedAt = Date.now();
    await page.getByRole("button", { name: "Secure Boon" }).click();
    await page.getByText("Move to the gate and press E").waitFor();
    metrics.claimVeilBoonMs = Date.now() - veilBoonStartedAt;

    const veilDungeonStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Dungeon" }).click();
    await page.getByText("Scene: Dungeon").waitFor();
    await page.getByText("Sigil search active").waitFor();
    metrics.transitionToVeilDungeonMs = Date.now() - veilDungeonStartedAt;

    const veilRelicStartedAt = Date.now();
    await page.getByRole("button", { name: "Claim Relic" }).click();
    await routeStatus(page, "Miniboss chamber").waitFor();
    await delay(250);
    metrics.claimVeilRelicMs = Date.now() - veilRelicStartedAt;

    const veilMinibossStartedAt = Date.now();
    const veilMinibossTimeout = Date.now() + 20000;
    while (Date.now() < veilMinibossTimeout) {
      const bossVaultOpen = await routeStatus(page, "Boss vault ready").isVisible().catch(() => false);
      if (bossVaultOpen) {
        break;
      }

      await page.getByRole("button", { name: "Strike Sentinel" }).click();
      await delay(300);
    }
    await routeStatus(page, "Boss vault ready").waitFor();
    metrics.veilMinibossClearMs = Date.now() - veilMinibossStartedAt;

    const veilBossStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Boss Vault" }).click();
    await page.getByText("Scene: Boss Vault").waitFor();
    await page.getByText("Sanctum curse").waitFor();
    metrics.transitionToVeilBossMs = Date.now() - veilBossStartedAt;

    const veilBossClearStartedAt = Date.now();
    const veilBossTimeout = Date.now() + 25000;
    while (Date.now() < veilBossTimeout) {
      const extractReady = await objectiveBanner(page).getByText("Extract with the clear").isVisible().catch(() => false);
      if (extractReady) {
        break;
      }

      await page.getByRole("button", { name: "Strike Boss" }).click();
      await delay(300);
    }
    await objectiveBanner(page).getByText("Extract with the clear").waitFor();
    await page.getByText(/^New scroll:/).waitFor();
    metrics.veilBossClearMs = Date.now() - veilBossClearStartedAt;

    const quickBindStartedAt = Date.now();
    const movesetPanel = page.locator("section.panel", {
      has: page.getByRole("heading", { name: "Moveset" })
    });
    const inventoryPanel = page.locator("section.panel", {
      has: page.getByRole("heading", { name: "Inventory" })
    });
    const veilRewardName = (
      (await movesetPanel.locator(".reward-card strong").textContent()) ?? ""
    ).replace("New scroll: ", "").trim();
    await page.getByRole("button", { name: "Quick bind" }).click();
    if (veilRewardName) {
      await page.locator(".loadout-chip.skill-chip", { hasText: veilRewardName }).first().waitFor();
    }
    metrics.quickBindRewardMs = Date.now() - quickBindStartedAt;

    const veilExtractStartedAt = Date.now();
    await page.getByRole("button", { name: "Extract" }).click();
    await page.getByText("Scene: Hub").waitFor();
    await page.getByRole("button", { name: "Shibuya Burn Sector", exact: true }).waitFor();
    metrics.extractFromVeilMs = Date.now() - veilExtractStartedAt;

    const cinderDeployStartedAt = Date.now();
    await page.getByRole("button", { name: "Shibuya Burn Sector", exact: true }).click();
    await page.getByRole("button", { name: /Deploy To Shibuya Burn Sector/ }).click();
    await page.getByText("Scene: Region").waitFor();
    await page.getByText("Route pressure: burn zone descent").waitFor();
    metrics.transitionToCinderRegionMs = Date.now() - cinderDeployStartedAt;

    const cinderBoonStartedAt = Date.now();
    await page.getByRole("button", { name: "Secure Boon" }).click();
    await page.getByText("Move to the gate and press E").waitFor();
    metrics.claimCinderBoonMs = Date.now() - cinderBoonStartedAt;

    const cinderDungeonStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Dungeon" }).click();
    await page.getByText("Scene: Dungeon").waitFor();
    await page.getByText("Core search active").waitFor();
    metrics.transitionToCinderDungeonMs = Date.now() - cinderDungeonStartedAt;

    const cinderRelicStartedAt = Date.now();
    await page.getByRole("button", { name: "Claim Relic" }).click();
    await routeStatus(page, "Miniboss chamber").waitFor();
    await delay(250);
    metrics.claimCinderRelicMs = Date.now() - cinderRelicStartedAt;

    const cinderMinibossStartedAt = Date.now();
    const cinderMinibossTimeout = Date.now() + 20000;
    while (Date.now() < cinderMinibossTimeout) {
      const bossVaultOpen = await routeStatus(page, "Boss vault ready").isVisible().catch(() => false);
      if (bossVaultOpen) {
        break;
      }

      await page.getByRole("button", { name: "Strike Sentinel" }).click();
      await delay(300);
    }
    await routeStatus(page, "Boss vault ready").waitFor();
    metrics.cinderMinibossClearMs = Date.now() - cinderMinibossStartedAt;

    const cinderBossStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Boss Vault" }).click();
    await page.getByText("Scene: Boss Vault").waitFor();
    await page.getByText("Furnace curse").waitFor();
    metrics.transitionToCinderBossMs = Date.now() - cinderBossStartedAt;

    const cinderBossClearStartedAt = Date.now();
    const cinderBossTimeout = Date.now() + 25000;
    while (Date.now() < cinderBossTimeout) {
      const extractReady = await objectiveBanner(page).getByText("Extract with the clear").isVisible().catch(() => false);
      if (extractReady) {
        break;
      }

      await page.getByRole("button", { name: "Strike Boss" }).click();
      await delay(300);
    }
    await objectiveBanner(page).getByText("Extract with the clear").waitFor();
    await page.getByText(/^New reward:/).waitFor();
    metrics.cinderBossClearMs = Date.now() - cinderBossClearStartedAt;

    const cinderQuickEquipStartedAt = Date.now();
    const cinderRewardName = (
      (await inventoryPanel.locator(".reward-card strong").textContent()) ?? ""
    ).replace("New reward: ", "").trim();
    await page.getByRole("button", { name: "Quick equip" }).click();
    if (cinderRewardName) {
      await page.locator(".loadout-chip", { hasText: cinderRewardName }).first().waitFor();
    }
    metrics.cinderQuickEquipMs = Date.now() - cinderQuickEquipStartedAt;

    const cinderExtractStartedAt = Date.now();
    await page.getByRole("button", { name: "Extract" }).click();
    await page.getByText("Scene: Hub").waitFor();
    metrics.extractFromCinderMs = Date.now() - cinderExtractStartedAt;

    await page.getByRole("button", { name: "Collapsed Cathedral Barrier", exact: true }).waitFor();

    const nightDeployStartedAt = Date.now();
    await page.getByRole("button", { name: "Collapsed Cathedral Barrier", exact: true }).click();
    await page.getByRole("button", { name: /Deploy To Collapsed Cathedral Barrier/ }).click();
    await page.getByText("Scene: Region").waitFor();
    await page.getByText("Route pressure: domain ascent").waitFor();
    metrics.transitionToNightRegionMs = Date.now() - nightDeployStartedAt;

    const nightBoonStartedAt = Date.now();
    await page.getByRole("button", { name: "Secure Boon" }).click();
    await page.getByText("Move to the gate and press E").waitFor();
    metrics.claimNightBoonMs = Date.now() - nightBoonStartedAt;

    const nightDungeonStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Dungeon" }).click();
    await page.getByText("Scene: Dungeon").waitFor();
    await page.getByText("Eclipse sigil search active").waitFor();
    metrics.transitionToNightDungeonMs = Date.now() - nightDungeonStartedAt;

    const nightRelicStartedAt = Date.now();
    await page.getByRole("button", { name: "Claim Relic" }).click();
    await routeStatus(page, "Miniboss chamber").waitFor();
    await delay(250);
    metrics.claimNightRelicMs = Date.now() - nightRelicStartedAt;

    const nightMinibossStartedAt = Date.now();
    const nightMinibossTimeout = Date.now() + 22000;
    while (Date.now() < nightMinibossTimeout) {
      const bossVaultOpen = await routeStatus(page, "Boss vault ready").isVisible().catch(() => false);
      if (bossVaultOpen) {
        break;
      }

      await page.getByRole("button", { name: "Strike Sentinel" }).click();
      await delay(300);
    }
    await routeStatus(page, "Boss vault ready").waitFor();
    metrics.nightMinibossClearMs = Date.now() - nightMinibossStartedAt;

    const nightBossStartedAt = Date.now();
    await page.getByRole("button", { name: "Enter Boss Vault" }).click();
    await page.getByText("Scene: Boss Vault").waitFor();
    await page.getByText("Midnight curse").waitFor();
    metrics.transitionToNightBossMs = Date.now() - nightBossStartedAt;

    const nightBossClearStartedAt = Date.now();
    const nightBossTimeout = Date.now() + 28000;
    while (Date.now() < nightBossTimeout) {
      const extractReady = await objectiveBanner(page).getByText("Extract with the clear").isVisible().catch(() => false);
      if (extractReady) {
        break;
      }

      await page.getByRole("button", { name: "Strike Boss" }).click();
      await delay(300);
    }
    await objectiveBanner(page).getByText("Extract with the clear").waitFor();
    await page.getByText(/^New scroll:/).waitFor();
    metrics.nightBossClearMs = Date.now() - nightBossClearStartedAt;

    const nightQuickBindStartedAt = Date.now();
    const nightRewardName = (
      (await movesetPanel.locator(".reward-card strong").textContent()) ?? ""
    ).replace("New scroll: ", "").trim();
    await page.getByRole("button", { name: "Quick bind" }).click();
    if (nightRewardName) {
      await page.locator(".loadout-chip.skill-chip", { hasText: nightRewardName }).first().waitFor();
    }
    metrics.nightQuickBindMs = Date.now() - nightQuickBindStartedAt;

    const nightExtractStartedAt = Date.now();
    await page.getByRole("button", { name: "Extract" }).click();
    await page.getByText("Scene: Hub").waitFor();
    metrics.extractFromNightMs = Date.now() - nightExtractStartedAt;

    const useFieldTonicStartedAt = Date.now();
    const fieldTonicCard = page.locator(".inventory-card", { hasText: "Recovery Talisman" }).first();
    await fieldTonicCard.getByRole("button", { name: "Use" }).click();
    await page.getByText("Used Recovery Talisman").waitFor();
    metrics.useFieldTonicMs = Date.now() - useFieldTonicStartedAt;

    const craftResinStartedAt = Date.now();
    const resinRecipeCard = page.locator(".inventory-crafting .inventory-card", { hasText: "CE Draught" }).first();
    await resinRecipeCard.getByRole("button", { name: "Craft" }).click();
    await page.getByText("Crafted CE Draught").waitFor();
    await page.locator(".inventory-card", { hasText: "CE Draught" }).first().waitFor();
    metrics.craftResinElixirMs = Date.now() - craftResinStartedAt;

    const furnaceRecipeCard = page.locator(".inventory-crafting .inventory-card", { hasText: "Maximum Technique Draught" }).first();
    const furnaceCraftButton = furnaceRecipeCard.getByRole("button", { name: "Craft" });
    const furnaceCraftEnabled = await furnaceCraftButton.isEnabled().catch(() => false);
    if (furnaceCraftEnabled) {
      const craftFurnaceStartedAt = Date.now();
      await furnaceCraftButton.click();
      await page.getByText("Crafted Maximum Technique Draught").waitFor();
      await page.locator(".inventory-card", { hasText: "Maximum Technique Draught" }).first().waitFor();
      metrics.craftFurnaceDraughtMs = Date.now() - craftFurnaceStartedAt;
      metrics.optionalSecondCraftWorked = true;
    } else {
      metrics.craftFurnaceDraughtMs = 0;
      metrics.optionalSecondCraftWorked = false;
    }

    const clearedRouteCards = page.locator(".route-progress-card").filter({ hasText: "Cleared route" });
    metrics.clearedRouteCount = await clearedRouteCards.count();
    const routeProgressText = (await page.locator(".route-progress-panel").textContent()) ?? "";
    metrics.clearedShatterVisible =
      routeProgressText.includes("Detention Center") && routeProgressText.includes("Cleared route");
    metrics.clearedVeilVisible =
      routeProgressText.includes("Barrier Shrine") && routeProgressText.includes("Cleared route");
    metrics.clearedCinderVisible =
      routeProgressText.includes("Shibuya Burn Sector") && routeProgressText.includes("Cleared route");
    metrics.clearedNightVisible =
      routeProgressText.includes("Collapsed Cathedral Barrier") && routeProgressText.includes("Current cleared route");

    const tutorialComplete = await page.evaluate(() =>
      window.localStorage.getItem("apex-clash:first-run-complete")
    );
    metrics.firstRunTutorialComplete = tutorialComplete === "true";

    const createSlotStartedAt = Date.now();
    const savePanel = page.locator("aside.panel", { hasText: "Save Slots" });
    await savePanel.getByRole("button", { name: "New", exact: true }).click();
    await savePanel.getByText("Save status").waitFor();
    await savePanel.getByText("slot created").waitFor();
    await savePanel.getByText("Resume mode").waitFor();
    await savePanel.getByText(/save snapshot \(slot-/).waitFor();
    await page.getByText("Resume: save-snapshot").waitFor();
    metrics.createSlotMs = Date.now() - createSlotStartedAt;
    metrics.snapshotResumeBootWorks = true;

    const liveResumeStartedAt = Date.now();
    await page.getByText("Live Profile Resume").click();
    await savePanel.getByText("Resume mode").waitFor();
    await savePanel.getByText("live profile session").waitFor();
    await page.waitForFunction(
      () => {
        const bodyText = document.body.innerText;
        return bodyText.includes("Resume: profile-session") || bodyText.includes("Resume: fresh-start");
      },
      { timeout: 10000 }
    );
    metrics.liveResumeBootMs = Date.now() - liveResumeStartedAt;
    metrics.liveResumeToggleWorks = true;
    metrics.snapshotResumeVisible = true;
    metrics.liveResumeVisible = true;

    const snapshotResumeStartedAt = Date.now();
    await page.locator(".slot-list .slot-card").first().click();
    await savePanel.getByText("Resume mode").waitFor();
    await savePanel.getByText(/save snapshot \(slot-/).waitFor();
    await page.getByText("Resume: save-snapshot").waitFor();
    metrics.snapshotResumeReturnMs = Date.now() - snapshotResumeStartedAt;

    const syncStartedAt = Date.now();
    await page.getByRole("button", { name: "Sync Current Run" }).click();
    await savePanel.getByText("Save status").waitFor();
    await savePanel.locator(".save-meta").filter({ hasText: "Save status" }).getByText("synced").waitFor();
    metrics.manualSyncMs = Date.now() - syncStartedAt;

    assert(metrics.shellReady, "Initial browser shell was not ready.");
    assert(metrics.liveResumeVisible, "Live profile resume state was not visible.");
    assert(metrics.liveResumeDefault, "Live profile resume was not the default mode.");
    assert(metrics.snapshotResumeVisible, "Snapshot resume state was not visible after slot creation.");
    assert(metrics.snapshotResumeBootWorks, "Snapshot resume did not drive the runtime through BootScene.");
    assert(metrics.liveResumeToggleWorks, "Resume toggle did not return to live profile mode.");
    assert(metrics.firstRunTutorialComplete, "First-run tutorial completion flag was not persisted.");
    assert(metrics.clearedRouteCount === 4, "Expected all four routes to remain visibly cleared in the hub.");
    assert(metrics.clearedShatterVisible, "Detention Center was not visibly marked cleared in the hub.");
    assert(metrics.clearedVeilVisible, "Barrier Shrine was not visibly marked cleared in the hub.");
    assert(metrics.clearedCinderVisible, "Shibuya Burn Sector was not visibly marked cleared in the hub.");
    assert(metrics.clearedNightVisible, "Collapsed Cathedral Barrier was not visibly marked cleared in the hub.");

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
          serverLogs: server?.logs?.slice(-10) ?? [],
          webLogs: staticServer ? ["static server"] : ["external web"],
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
    if (staticServer) {
      await new Promise((resolve) => staticServer.close(resolve));
    }
    await stopManagedProcess(server);
  }
}

await run();
