import { lazy, Suspense, useState } from "react";
import { GameHud } from "./components/GameHud";
import { SavePanel } from "./components/SavePanel";
import { useGameAudio } from "./hooks/useGameAudio";
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

const launcherCards = [
  {
    title: "HUD First",
    detail: "Menus, stats, combat prompts, and inventory need to feel console-grade in browser."
  },
  {
    title: "8-bit Identity",
    detail: "Pixel-inspired panels, deliberate color coding, and later sprite/audio kits must feel cohesive."
  },
  {
    title: "Fast Feedback",
    detail: "Every click, dodge, hit, loot pickup, and death state needs immediate visual and audio response."
  }
];

function App() {
  const { content, status, error } = useBootstrapContent();
  const [selectedArchetype, setSelectedArchetype] = useState("close_combat");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const runtime = useGameRuntime();
  const {
    slots,
    status: saveApiStatus,
    error: saveError,
    selectedSlotId,
    setSelectedSlotId,
    createSlot,
    saveCurrentRun
  } = useSaveSlots(selectedArchetype, runtime);

  useGameAudio(soundEnabled);

  const selectedDefinition = content?.classes?.find(
    (entry) => entry.id === selectedArchetype
  );

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Browser-first MERN + Phaser vertical slice</p>
          <h1>Apex Clash</h1>
          <p className="hero-text">
            Single-player occult action RPG with top-down PvE combat, build
            progression, and data-driven content.
          </p>
          <div className="pill-list">
            {experiencePillars.map((pillar) => (
              <span key={pillar} className="pill">
                {pillar}
              </span>
            ))}
          </div>
        </div>
        <div className="status-card">
          <h2>Current slice</h2>
          <ul>
            <li>Combat sandbox scene in Phaser</li>
            <li>Shared content bootstrap from Express</li>
            <li>Class selection driving runtime stats</li>
            <li>Frontend UX now treated as a core milestone, not polish</li>
          </ul>
        </div>
      </section>

      <section className="launcher-strip">
        {launcherCards.map((entry) => (
          <article key={entry.title} className="launcher-card">
            <p className="launcher-kicker">{entry.title}</p>
            <p>{entry.detail}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <aside className="panel">
          <h2>Archetypes</h2>
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
        </aside>

        <section className="panel">
          <h2>Sandbox</h2>
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
              ready={status === "ready"}
            />
          </Suspense>
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
              {Object.entries(selectedDefinition?.baseStats ?? {}).map(([key, value]) => (
                <div key={key} className="stat-row">
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="note-block">
              <strong>Next build target</strong>
              <p>
                Expand this sandbox into a hub-to-dungeon loop, then wire save
                slots, leveling, and inventory against the existing API shell.
              </p>
            </div>
            <div className="ux-list">
              <strong>Browser UX checklist</strong>
              <ul>
                <li>Readable HUD at laptop and desktop sizes</li>
                <li>Distinct color and sound language for combat feedback</li>
                <li>Input hints always visible during early progression</li>
              </ul>
            </div>
          </section>
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
