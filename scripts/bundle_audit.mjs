import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const assetsDir = path.join(rootDir, "web", "dist", "assets");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectAssetMetrics() {
  assert(fs.existsSync(assetsDir), "Missing built web assets. Run `npm run build` before bundle audit.");
  const entries = fs.readdirSync(assetsDir);
  return entries.map((file) => {
    const absolutePath = path.join(assetsDir, file);
    const sizeBytes = fs.statSync(absolutePath).size;
    return {
      file,
      sizeBytes,
      sizeKb: Number((sizeBytes / 1024).toFixed(2))
    };
  });
}

const metrics = collectAssetMetrics();
const phaserChunk = metrics.find((entry) => entry.file.startsWith("phaser-runtime-"));
const gameRuntimeChunk = metrics.find((entry) => entry.file.startsWith("game-runtime-"));
const reactChunk = metrics.find((entry) => entry.file.startsWith("react-vendor-"));
const appChunk = metrics.find((entry) => /^index-.*\.js$/.test(entry.file));
const canvasChunk = metrics.find((entry) => entry.file.startsWith("GameCanvas-"));

assert(phaserChunk, "Missing Phaser runtime chunk.");
assert(gameRuntimeChunk, "Missing game runtime chunk.");
assert(reactChunk, "Missing React vendor chunk.");
assert(appChunk, "Missing main app chunk.");
assert(canvasChunk, "Missing lazy GameCanvas chunk.");

assert(phaserChunk.sizeKb <= 1300, `Phaser chunk exceeded budget: ${phaserChunk.sizeKb} kB > 1300 kB`);
assert(gameRuntimeChunk.sizeKb <= 160, `Game runtime chunk exceeded budget: ${gameRuntimeChunk.sizeKb} kB > 160 kB`);
assert(reactChunk.sizeKb <= 170, `React vendor chunk exceeded budget: ${reactChunk.sizeKb} kB > 170 kB`);
assert(appChunk.sizeKb <= 60, `Main app chunk exceeded budget: ${appChunk.sizeKb} kB > 60 kB`);
assert(canvasChunk.sizeKb <= 5, `GameCanvas lazy chunk exceeded budget: ${canvasChunk.sizeKb} kB > 5 kB`);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "passed",
      metrics: {
        phaserChunkKb: phaserChunk.sizeKb,
        gameRuntimeChunkKb: gameRuntimeChunk.sizeKb,
        reactChunkKb: reactChunk.sizeKb,
        appChunkKb: appChunk.sizeKb,
        gameCanvasChunkKb: canvasChunk.sizeKb
      }
    },
    null,
    2
  )}\n`
);
