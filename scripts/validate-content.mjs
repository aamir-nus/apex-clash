import fs from "node:fs";
import path from "node:path";

const contentRoot = path.resolve("shared/content");
const requiredFiles = [
  "classes.json",
  "enemies.json",
  "items.json",
  "regions.json",
  "skills.json"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const fileName of requiredFiles) {
  const absolutePath = path.join(contentRoot, fileName);
  assert(fs.existsSync(absolutePath), `Missing content file: ${fileName}`);

  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
  assert(Array.isArray(parsed), `${fileName} must export an array`);
  assert(parsed.length > 0, `${fileName} must contain at least one entry`);
}

console.log("Shared content validation passed");
