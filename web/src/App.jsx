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

function buildSceneActions(scene, regionCards, selectedRegionId, encounterStatus) {
  if (scene === "hub") {
    return {
      title: "Deploy Controls",
      detail: "Use buttons or keyboard. This path is stable for browser play and test automation.",
      regionActions: regionCards.map((region) => ({
        id: `select-${region.id}`,
        label: region.name,
        active: selectedRegionId === region.id,
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
  const regionCards = (content?.regions ?? []).filter((region) => unlockedRegionIds.includes(region.id));
  const sceneActions = buildSceneActions(
    runtime.scene.scene,
    regionCards,
    runtime.selectedRegionId,
    runtime.encounter.status
  );

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
          <h2>Current slice</h2>
          <ul>
            <li>Hub to region to combat loop</li>
            <li>Live HUD + save panel</li>
            <li>Player auth layer + loadout panel</li>
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
              <div className="hub-command-copy">
                <strong>{sceneActions.title}</strong>
                <span>{sceneActions.detail}</span>
              </div>
              {sceneActions.regionActions?.length ? (
                <div className="hub-region-actions">
                  {sceneActions.regionActions.map((action) => (
                    <button
                      key={action.id}
                      className={action.active ? "hub-action active" : "hub-action"}
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
            <h2>Build Summary</h2>
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
                Expand into multi-region progression, verify Mongo in real runs,
                and replace placeholder combat loops with authored encounters.
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
