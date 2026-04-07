import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requestLoggerSource = readText("server/src/middleware/requestLogger.js");
const errorHandlerSource = readText("server/src/middleware/errorHandler.js");
const playerControllerSource = readText("server/src/controllers/playerController.js");
const saveControllerSource = readText("server/src/controllers/saveController.js");
const saveSlotsHookSource = readText("web/src/hooks/useSaveSlots.js");

const metrics = {
  requestLifecycleLogs:
    (requestLoggerSource.includes("HTTP request started") ? 1 : 0) +
    (requestLoggerSource.includes("HTTP request completed") ? 1 : 0),
  playerWarnPaths:
    (playerControllerSource.match(/logger\.warn\(/g) ?? []).length,
  saveWarnPaths:
    (saveControllerSource.match(/logger\.warn\(/g) ?? []).length,
  saveInfoPaths:
    (saveControllerSource.match(/logger\.info\(/g) ?? []).length,
  clientBackgroundSyncErrorFields:
    ["slotId", "regionId", "scene", "message"].filter((key) =>
      saveSlotsHookSource.includes(`${key}:`)
    ).length
};

assert(
  requestLoggerSource.includes("HTTP request started") &&
    requestLoggerSource.includes("HTTP request completed") &&
    requestLoggerSource.includes("requestId"),
  "Request logger must emit start/completion logs with requestId context."
);
assert(
  errorHandlerSource.includes("Unhandled request error") &&
    errorHandlerSource.includes("requestId") &&
    errorHandlerSource.includes("path") &&
    errorHandlerSource.includes("error: error.message"),
  "Error handler must log requestId, path, and error message."
);
assert(
  playerControllerSource.includes('logger.warn("Rejected reward claim"') &&
    playerControllerSource.includes("rewardSource: request.body?.rewardSource") &&
    playerControllerSource.includes("regionId: request.body?.regionId"),
  "Reward claim rejections must log rewardSource and regionId."
);
assert(
  playerControllerSource.includes('logger.warn("Rejected skill equip"') &&
    playerControllerSource.includes("skillIds: request.body?.skillIds"),
  "Skill equip rejections must log attempted skillIds."
);
assert(
  saveControllerSource.includes('logger.info("Save slot created"') &&
    saveControllerSource.includes('logger.info("Save slot updated"') &&
    saveControllerSource.includes('logger.warn("Rejected save slot update for missing slot"'),
  "Save controller must log create, update, and missing-slot rejection paths."
);
assert(
  saveSlotsHookSource.includes('window.console.error("Background save sync failed"') &&
    saveSlotsHookSource.includes("slotId: selectedSlotId") &&
    saveSlotsHookSource.includes("regionId: savePayload.regionId") &&
    saveSlotsHookSource.includes("scene: runtime.scene.scene") &&
    saveSlotsHookSource.includes('message: syncError?.message ?? "Unknown error"'),
  "Client background sync failures must log slotId, regionId, scene, and message."
);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "passed",
      metrics
    },
    null,
    2
  )}\n`
);
