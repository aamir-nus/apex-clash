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

const transitionSource = readText("web/src/components/SceneTransitionOverlay.jsx");
const hudSource = readText("web/src/components/GameHud.jsx");
const appSource = readText("web/src/App.jsx");
const savePanelSource = readText("web/src/components/SavePanel.jsx");
const movesetPanelSource = readText("web/src/components/MovesetPanel.jsx");
const profileHookSource = readText("web/src/hooks/usePlayerProfile.js");

const metrics = {
  transitionOverlayVisible:
    (transitionSource.includes("Transition") ? 1 : 0) +
    (transitionSource.includes("Changing scene") ? 1 : 0) +
    (transitionSource.includes("Preparing next area") ? 1 : 0),
  hudFlowSurfaces:
    [
      "Resume:",
      "Reward secured",
      "Bound Skills",
      "Combat Feed",
      "Loadout Sync",
      "objective-banner"
    ].filter((token) => hudSource.includes(token)).length,
  saveResumeSurfaces:
    [
      "Live Profile Resume",
      "Resume mode:",
      "Background sync:",
      "Use backend session state"
    ].filter((token) => savePanelSource.includes(token)).length,
  rewardBindFeedbackSurfaces:
    [
      "Quick bind reward",
      "Fresh bind",
      "Runtime bindings, Domain Surge stays on R",
      "Bind techniques from the moveset panel"
    ].filter((token) => `${movesetPanelSource}\n${hudSource}`.includes(token)).length
};

assert(
  transitionSource.includes("Transition") &&
    transitionSource.includes("Changing scene") &&
    transitionSource.includes("Preparing next area"),
  "Transition overlay must present a visible transition state with label and detail copy."
);

assert(
  hudSource.includes("Resume:") &&
    hudSource.includes("Reward secured") &&
    hudSource.includes("Bound Skills") &&
    hudSource.includes("Combat Feed") &&
    hudSource.includes("Loadout Sync"),
  "HUD must expose resume source, reward state, bound skills, combat feed, and loadout sync."
);

assert(
  hudSource.includes("Fresh bind") &&
    hudSource.includes("Domain Surge") &&
    movesetPanelSource.includes("Domain Surge stays on R"),
  "Reward-to-bind UX must expose fresh bind feedback and reserved Domain Surge messaging."
);

assert(
  savePanelSource.includes("Live Profile Resume") &&
    savePanelSource.includes("Resume mode:") &&
    savePanelSource.includes("Background sync:") &&
    savePanelSource.includes("Use backend session state"),
  "Save panel must expose resume source and background sync state to the player."
);

assert(
  appSource.includes("firstRunTutorial") &&
    appSource.includes("Input hints always visible during early progression"),
  "App shell must still carry the first-run tutorial flow and explicit UX checklist emphasis."
);

assert(
  profileHookSource.includes("emitCombatFeedEvent") &&
    profileHookSource.includes("bound to") &&
    profileHookSource.includes("equipped to"),
  "Reward/equip actions must emit combat-feed confirmations."
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
