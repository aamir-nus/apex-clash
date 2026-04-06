import { lazy, Suspense, useState } from "react";
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

function App() {
  const { content, status, error } = useBootstrapContent();
  const [selectedArchetype, setSelectedArchetype] = useState("close_combat");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const auth = useAuthSession();
  const runtime = useGameRuntime();
  const playerProfile = usePlayerProfile(auth.session.token, selectedArchetype);
  const {
    slots,
    status: saveApiStatus,
    error: saveError,
    selectedSlotId,
    setSelectedSlotId,
    activeSave,
    createSlot,
    saveCurrentRun
  } = useSaveSlots(selectedArchetype, runtime, auth.session.token);

  useGameAudio(soundEnabled);

  const selectedDefinition = content?.classes?.find(
    (entry) => entry.id === selectedArchetype
  );
  const effectiveStats = playerProfile.profile?.computedStats ?? selectedDefinition?.baseStats ?? {};
  const compatibleItems = playerProfile.profile?.inventoryItems ?? [];
  const equippedItems = playerProfile.profile?.equippedItems ?? [];
  const availableSkills = playerProfile.profile?.availableSkills ?? [];
  const equippedSkillIds = playerProfile.profile?.equippedSkills?.map((skill) => skill.id) ?? [];

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
              ready={status === "ready"}
            />
          </Suspense>
          <SceneTransitionOverlay transition={runtime.transition} />
          <LevelUpPanel runtime={runtime} />
          <GameHud
            runtime={runtime}
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
                Tighten exploration feel, add real dungeon layouts, then move
                save persistence to Mongo.
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
            locked={!auth.isAuthenticated}
            onEquipSkills={(skillIds) => playerProfile.equipSkills(skillIds)}
          />
          <InventoryPanel
            items={compatibleItems}
            equippedItems={equippedItems}
            locked={!auth.isAuthenticated}
            onEquip={(item) => playerProfile.equipItem(item.id)}
          />
          <SavePanel
            slots={slots}
            status={saveApiStatus}
            error={saveError}
            selectedSlotId={selectedSlotId}
            setSelectedSlotId={setSelectedSlotId}
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
