import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentRoot = path.resolve(__dirname, "../../../shared/content");

function readContentFile(fileName) {
  const absolutePath = path.join(contentRoot, fileName);
  return JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
}

export function getClassDefinitions() {
  return readContentFile("classes.json");
}

export function getClassDefinition(archetypeId) {
  return getClassDefinitions().find((entry) => entry.id === archetypeId) ?? null;
}

export function getBootstrapContent() {
  return {
    classes: getClassDefinitions(),
    dungeons: readContentFile("dungeons.json"),
    enemies: readContentFile("enemies.json"),
    items: readContentFile("items.json"),
    regions: readContentFile("regions.json"),
    skills: readContentFile("skills.json")
  };
}
