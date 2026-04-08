import { lazy, Suspense, useState } from "react";
import { useEffect } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { GameHud } from "./components/GameHud";
import { InventoryPanel } from "./components/InventoryPanel";
import { LevelUpPanel } from "./components/LevelUpPanel";
import { MovesetPanel } from "./components/MovesetPanel";
import { SavePanel } from "./components/SavePanel";
import { SceneTransitionOverlay } from "./components/SceneTransitionOverlay";
import { useAuthSession } from "./hooks/useAuthSession";
import { useGameAudio } from "./hooks/useGameAudio";
import { usePlayerProfile } from "./hooks/usePlayerProfile";
import { useGameRuntime } from "./hooks/useGameRuntime";
import { useSaveSlots } from "./hooks/useSaveSlots";
import { useBootstrapContent } from "./hooks/useBootstrapContent";
import { emitControlCommand } from "./game/runtime/runtimeBridge";
import { buildQuickBindSkillIds } from "./utils/skillBindings";

const GameCanvas = lazy(() =>
  import("./components/GameCanvas").then((module) => ({
    default: module.GameCanvas
  }))
);

const archetypeDescriptions = {
  close_combat: "High melee pressure, stagger focus, gap closers.",
  mid_range: "Hybrid spacing tools with balanced offense and mobility.",
  long_range: "Projectile-heavy control build with fragile defenses.",
  heavenly_restriction: "Weapon specialist with high body stats and low CE growth."
};

const experiencePillars = [
  "Readable browser HUD with low-friction inputs",
  "8-bit inspired art direction with high combat clarity",
  "Short, punchy sound cues for hits, pickups, and danger states"
];

const routeToneById = {
  shatter_block: "route-shatter",
  veil_shrine: "route-veil",
  cinder_ward: "route-cinder"
};

const routeBriefings = {
  shatter_block: {
    label: "Rupture Sweep",
    summary: "Broken streets, low-rank curse pressure, and the fastest first clear in the build.",
    directive: "Secure one boon fast, crack the relic room, and push cleanly into the first boss vault."
  },
  veil_shrine: {
    label: "Sanctum Descent",
    summary: "A timing route built around sealed pressure, rupture windows, and scroll progression.",
    directive: "Strip the sanctum shield, respect the lane, then bind the scroll reward immediately."
  },
  cinder_ward: {
    label: "Furnace Descent",
    summary: "Heat pressure, cooling breaches, and faster reward-to-equip conversion.",
    directive: "Stabilize the core, punish only on the breach, and extract with the emblem."
  }
};

function isRouteCleared(regionId, clearedRegionIds, unlockedRegionIds) {
  if (clearedRegionIds.includes(regionId)) {
    return true;
  }

  if (regionId === "shatter_block") {
    return unlockedRegionIds.includes("veil_shrine") || unlockedRegionIds.includes("cinder_ward");
  }

  if (regionId === "veil_shrine") {
    return unlockedRegionIds.includes("cinder_ward");
  }

  return false;
}

function buildSceneActions(scene, regionCards, selectedRegionId, encounterStatus) {
  if (scene === "hub") {
    return {
      title: "Deploy Controls",
      detail: "Use buttons or keyboard. This path is stable for browser play and test automation.",
      statusLabel: "Hub routing",
      regionActions: regionCards.map((region) => ({
        id: `select-${region.id}`,
        label: region.name,
        active: selectedRegionId === region.id,
        toneClass: routeToneById[region.id] ?? "",
        command: {
          scene: "hub",
          type: "select-region",
          regionId: region.id
        }
      })),
      primaryAction: {
        label: `Deploy To ${regionCards.find((region) => region.id === selectedRegionId)?.name ?? "Region"}`,
        command: {
          scene: "hub",
          type: "deploy"
        }
      }
    };
  }

  if (scene === "region") {
    return {
      title: "Route Actions",
      detail: "Visible route controls mirror the same region interactions as keyboard play.",
      statusLabel: encounterStatus,
      regionActions: [],
      primaryAction: null,
      secondaryActions: [
        { label: "Secure Boon", command: { scene: "region", type: "claim-boon" } },
        { label: "Enter Dungeon", command: { scene: "region", type: "enter-dungeon" } },
        { label: "Return Hub", command: { scene: "region", type: "return-hub" } }
      ]
    };
  }

  if (scene === "dungeon") {
    return {
      title: "Dungeon Actions",
      detail: `Current state: ${encounterStatus}. Use these controls if keyboard choreography gets in the way.`,
      statusLabel: encounterStatus,
      regionActions: [],
      primaryAction: null,
      secondaryActions: [
        { label: "Claim Relic", command: { scene: "dungeon", type: "claim-relic" } },
        { label: "Strike Sentinel", command: { scene: "dungeon", type: "attack-miniboss" } },
        { label: "Enter Boss Vault", command: { scene: "dungeon", type: "enter-boss-vault" } },
        { label: "Return Region", command: { scene: "dungeon", type: "return-region" } }
      ]
    };
  }

  if (scene === "boss") {
    return {
      title: "Boss Actions",
      detail: `Current state: ${encounterStatus}. These controls drive the same vault logic as runtime inputs.`,
      statusLabel: encounterStatus,
      regionActions: [],
      primaryAction: null,
      secondaryActions: [
        { label: "Strike Boss", command: { scene: "boss", type: "attack-boss" } },
        { label: "Extract", command: { scene: "boss", type: "extract" } }
      ]
    };
  }

  return null;
}

function App() {
  const { content, status, error } = useBootstrapContent();
  const [selectedArchetype, setSelectedArchetype] = useState("close_combat");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [firstRunTutorial, setFirstRunTutorial] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.localStorage.getItem("apex-clash:first-run-complete") !== "true";
  });
  const auth = useAuthSession();
  const runtime = useGameRuntime();
  const playerProfile = usePlayerProfile(auth.session.token, selectedArchetype);
  const {
    slots,
    status: saveApiStatus,
    error: saveError,
    backgroundSync,
    selectedSlotId,
    setSelectedSlotId,
    activeSave,
    createSlot,
    saveCurrentRun
  } = useSaveSlots(selectedArchetype, runtime, auth.session.token, playerProfile.applyProfileUpdate);

  useGameAudio(soundEnabled);

  useEffect(() => {
    if (!firstRunTutorial) {
      return;
    }

    if (runtime.scene.scene === "region" || runtime.scene.scene === "combat") {
      setFirstRunTutorial(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("apex-clash:first-run-complete", "true");
      }
    }
  }, [firstRunTutorial, runtime.scene.scene]);

  const selectedDefinition = content?.classes?.find(
    (entry) => entry.id === selectedArchetype
  );
  const effectiveStats = playerProfile.profile?.computedStats ?? selectedDefinition?.baseStats ?? {};
  const compatibleItems = playerProfile.profile?.inventoryItems ?? [];
  const equippedItems = playerProfile.profile?.equippedItems ?? [];
  const availableSkills = playerProfile.profile?.availableSkills ?? [];
  const equippedSkillIds = playerProfile.profile?.equippedSkills?.map((skill) => skill.id) ?? [];
  const unlockedRegionIds = [
    ...new Set([
      ...(playerProfile.profile?.unlockedRegionIds ?? ["shatter_block"]),
      ...(runtime.sessionState?.unlockedRegionIds ?? [])
    ])
  ];
  const clearedRegionIds = playerProfile.profile?.clearedRegionIds ?? [];
  const regionCards = (content?.regions ?? []).filter((region) => unlockedRegionIds.includes(region.id));
  const sceneActions = buildSceneActions(
    runtime.scene.scene,
    regionCards,
    runtime.selectedRegionId,
    runtime.encounter.status
  );
  const routeTracker = (content?.regions ?? [])
    .filter((region) => region.type === "region")
    .map((region) => ({
      ...region,
      unlocked: unlockedRegionIds.includes(region.id),
      cleared: isRouteCleared(region.id, clearedRegionIds, unlockedRegionIds),
      active:
        runtime.selectedRegionId === region.id ||
        runtime.regionId === region.id ||
        runtime.regionId === region.id.replace("_block", "_dungeon")
    }));
  const clearedRouteCount = routeTracker.filter((route) => route.cleared).length;
  const unlockedRouteCount = routeTracker.filter((route) => route.unlocked).length;
  const routeCompletionPercent = routeTracker.length
    ? Math.round((clearedRouteCount / routeTracker.length) * 100)
    : 0;
  const highlightedRouteId =
    runtime.scene.scene === "hub"
      ? runtime.selectedRegionId
      : runtime.regionId === "shatter_dungeon" || runtime.regionId === "shatter_boss_vault"
        ? "shatter_block"
        : runtime.regionId === "veil_dungeon" || runtime.regionId === "veil_boss_vault"
          ? "veil_shrine"
          : runtime.regionId === "cinder_dungeon" || runtime.regionId === "cinder_boss_vault"
            ? "cinder_ward"
            : runtime.regionId;
  const highlightedRoute = routeTracker.find((route) => route.id === highlightedRouteId) ?? routeTracker[0];
  const highlightedBriefing = routeBriefings[highlightedRoute?.id] ?? routeBriefings.shatter_block;

  return (
    <main className="app-shell">
      <section className="hero-panel compact">
        <div className="hero-copy compact">
          <p className="eyebrow">Browser-first MERN + Phaser vertical slice</p>
          <h1>Apex Clash</h1>
          <div className="pill-list">
            {experiencePillars.map((pillar) => (
              <span key={pillar} className="pill">
                {pillar}
              </span>
            ))}
          </div>
        </div>
        <div className="status-card compact">
          <h2>Field Brief</h2>
          <ul>
            <li>{highlightedRoute?.name ?? "Shatter Block"} is the active route focus</li>
            <li>{highlightedBriefing.summary}</li>
            <li>{runtime.objective?.title ?? "Deploy and take the next room cleanly."}</li>
          </ul>
        </div>
      </section>

      <AuthPanel auth={auth} />

      <section className="dashboard-grid">
        <section className="panel game-stage">
          <div className="stage-header">
            <div>
              <h2>Play Surface</h2>
              <p className="stage-subtitle">Focus the game and move immediately.</p>
            </div>
            <div className="archetype-inline">
              <span className="inline-label">Build</span>
            </div>
          </div>
          <div className="archetype-list">
            {(content?.classes ?? []).map((entry) => (
              <button
                key={entry.id}
                className={entry.id === selectedArchetype ? "card active" : "card"}
                onClick={() => setSelectedArchetype(entry.id)}
                type="button"
              >
                <span>{entry.name}</span>
                <small>{archetypeDescriptions[entry.id]}</small>
              </button>
            ))}
          </div>
          <div className="sandbox-meta">
            <div>
              <strong>Boot status</strong>
              <span>{status}</span>
            </div>
            <div>
              <strong>Selected build</strong>
              <span>{selectedDefinition?.name ?? "Loading"}</span>
            </div>
            <div>
              <strong>Core fantasy</strong>
              <span>{selectedDefinition?.combatStyle ?? "Resolving content"}</span>
            </div>
            <div>
              <strong>Input focus</strong>
              <span>Keyboard-first, controller-ready, browser-native</span>
            </div>
            <div>
              <strong>Route ladder</strong>
              <span>{clearedRouteCount}/{routeTracker.length || 3} cleared · {routeCompletionPercent}% complete</span>
            </div>
            <div>
              <strong>Current operation</strong>
              <span>{highlightedBriefing.label}</span>
            </div>
            <div>
              <strong>Directive</strong>
              <span>{highlightedBriefing.directive}</span>
            </div>
          </div>
          <Suspense fallback={<div className="canvas-loading">Loading Phaser runtime...</div>}>
            <GameCanvas
              content={content}
              selectedArchetype={selectedArchetype}
              playerProfile={playerProfile.profile}
              activeSave={activeSave}
              firstRunTutorial={firstRunTutorial}
              ready={status === "ready"}
            />
          </Suspense>
          {sceneActions ? (
            <div className="hub-command-deck">
              <div className="hub-command-header">
                <div className="hub-command-copy">
                  <strong>{sceneActions.title}</strong>
                  <span>{sceneActions.detail}</span>
                </div>
                <span className="route-status-pill">{sceneActions.statusLabel}</span>
              </div>
              {sceneActions.regionActions?.length ? (
                <div className="hub-region-actions">
                  {sceneActions.regionActions.map((action) => (
                    <button
                      key={action.id}
                      className={action.active ? `hub-action active ${action.toneClass ?? ""}` : `hub-action ${action.toneClass ?? ""}`}
                      onClick={() => emitControlCommand(action.command)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {sceneActions.secondaryActions?.length ? (
                <div className="hub-region-actions">
                  {sceneActions.secondaryActions.map((action) => (
                    <button
                      key={action.label}
                      className="hub-action"
                      onClick={() => emitControlCommand(action.command)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {sceneActions.primaryAction ? (
                <button
                  className="deploy-action"
                  onClick={() => emitControlCommand(sceneActions.primaryAction.command)}
                  type="button"
                >
                  {sceneActions.primaryAction.label}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="route-progress-panel">
            <div className="panel-header compact">
              <strong>Route Progress</strong>
              <small>
                {clearedRouteCount === routeTracker.length && routeTracker.length
                  ? "All authored routes cleared in the current browser run."
                  : `${clearedRouteCount} cleared · ${unlockedRouteCount} unlocked · next route ready`}
              </small>
            </div>
            <div className={`route-brief-card ${routeToneById[highlightedRoute?.id] ?? ""}`}>
              <div className="route-brief-copy">
                <strong>{highlightedRoute?.name ?? "Blacksite Route"}</strong>
                <span>{highlightedBriefing.summary}</span>
              </div>
              <small>{highlightedBriefing.directive}</small>
            </div>
            <div className="route-progress-summary">
              <div className="route-progress-meter" aria-hidden="true">
                <span style={{ width: `${routeCompletionPercent}%` }} />
              </div>
              <div className="route-progress-copy">
                <strong>
                  {clearedRouteCount === routeTracker.length && routeTracker.length
                    ? "Blacksite route ladder complete"
                    : "Current browser-proven path and next unlock targets"}
                </strong>
                <small>
                  {clearedRouteCount === routeTracker.length && routeTracker.length
                    ? "Shatter, Veil, and Cinder are all represented as cleared."
                    : "Hub cards reflect active, cleared, and unlocked route state from runtime and profile sync."}
                </small>
              </div>
            </div>
            <div className="route-progress-grid">
              {routeTracker.map((route, index) => (
                <div
                  key={route.id}
                  className={
                    route.active
                      ? route.cleared
                        ? `route-progress-card active cleared ${routeToneById[route.id] ?? ""}`
                        : `route-progress-card active ${routeToneById[route.id] ?? ""}`
                      : route.cleared
                      ? `route-progress-card cleared ${routeToneById[route.id] ?? ""}`
                      : route.unlocked
                      ? `route-progress-card ${routeToneById[route.id] ?? ""}`
                      : "route-progress-card locked"
                  }
                >
                  <strong>{route.name}</strong>
                  <span>
                    {route.active
                      ? route.cleared
                        ? "Current cleared route"
                        : "Current route"
                      : route.cleared
                      ? "Cleared route"
                      : route.unlocked
                      ? `Unlocked route ${index + 1}`
                      : "Locked route"}
                  </span>
                  <small>Recommended level {route.recommendedLevel ?? "?"}</small>
                </div>
              ))}
            </div>
          </div>
          <SceneTransitionOverlay transition={runtime.transition} />
          <LevelUpPanel
            runtime={runtime}
            onChoose={(optionId) => playerProfile.applyLevelChoice(optionId, runtime.player)}
          />
          <GameHud
            runtime={runtime}
            latestReward={playerProfile.latestReward}
            loadoutFeedback={playerProfile.loadoutFeedback}
            profile={playerProfile.profile}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((current) => !current)}
          />
          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <aside className="panel-stack">
          <section className="panel">
            <h2>Operator Summary</h2>
            <div className="stat-block">
              {Object.entries(effectiveStats).map(([key, value]) => (
                <div key={key} className="stat-row">
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="note-block">
              <strong>Current push</strong>
              <p>
                Hold the proven three-route path, sharpen scene readability, and keep pushing toward authored encounter depth.
              </p>
            </div>
            <div className="ux-list">
              <strong>Browser UX checklist</strong>
              <ul>
                <li>Readable HUD at laptop and desktop sizes</li>
                <li>Distinct color and sound language for combat feedback</li>
                <li>Input hints always visible during early progression</li>
                <li>Players can see auth, moveset, and gear state clearly</li>
              </ul>
            </div>
          </section>
          <MovesetPanel
            skills={availableSkills}
            equippedSkillIds={equippedSkillIds}
            latestReward={playerProfile.latestReward}
            locked={!auth.isAuthenticated}
            onEquipSkills={(skillIds) => playerProfile.equipSkills(skillIds)}
            onQuickBindReward={() => {
              if (playerProfile.latestReward?.type !== "scroll") {
                return;
              }

              const nextSkillIds = buildQuickBindSkillIds(
                equippedSkillIds,
                playerProfile.latestReward.id
              );
              playerProfile.equipSkills(nextSkillIds);
            }}
          />
          <InventoryPanel
            items={compatibleItems}
            equippedItems={equippedItems}
            latestReward={playerProfile.latestReward}
            locked={!auth.isAuthenticated}
            onEquip={(item) => playerProfile.equipItem(item.id)}
          />
          <SavePanel
            slots={slots}
            status={saveApiStatus}
            error={saveError}
            backgroundSync={backgroundSync}
            profileResumeRegion={playerProfile.profile?.currentRegionId}
            selectedSlotId={selectedSlotId}
            setSelectedSlotId={setSelectedSlotId}
            onUseProfileResume={() => setSelectedSlotId("")}
            onCreateSlot={async () => {
              try {
                setSaveStatus("creating");
                await createSlot();
                setSaveStatus("slot created");
              } catch {
                setSaveStatus("create failed");
              }
            }}
            onSaveCurrentRun={async () => {
              try {
                setSaveStatus("syncing");
                await saveCurrentRun();
                setSaveStatus("synced");
              } catch {
                setSaveStatus("sync failed");
              }
            }}
            saveStatus={saveStatus}
          />
        </aside>
      </section>
    </main>
  );
}

export default App;
