function StatBar({ label, value, max, tone }) {
  const width = max > 0 ? `${Math.max(0, Math.min(100, (value / max) * 100))}%` : "0%";

  return (
    <div className="hud-bar">
      <div className="hud-bar-label">
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div className="hud-bar-track">
        <div className={`hud-bar-fill ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

export function GameHud({ runtime, soundEnabled, onToggleSound }) {
  return (
    <div className="game-hud">
      <div className="hud-topline">
        <div>
          <p className="hud-kicker">Live Session</p>
          <h3>{runtime.player.archetype}</h3>
        </div>
        <button className="sound-toggle" onClick={onToggleSound} type="button">
          Sound: {soundEnabled ? "On" : "Off"}
        </button>
      </div>

      <div className="hud-grid">
        <section className="hud-panel">
          <StatBar label="HP" value={runtime.player.hp} max={runtime.player.maxHp} tone="hp" />
          <StatBar label="CE" value={runtime.player.ce} max={runtime.player.maxCe} tone="ce" />
          <div className="hud-meta">
            <span>Level {runtime.player.level}</span>
            <span>XP {runtime.player.xp}</span>
            <span>Next {runtime.player.xpToNextLevel}</span>
            <span>Pts {runtime.player.pendingStatPoints}</span>
            <span>{runtime.encounter.status}</span>
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Cooldowns</p>
          <div className="cooldown-row">
            {runtime.cooldowns.map((cooldown) => (
              <div key={cooldown.id} className="cooldown-card">
                <strong>{cooldown.key}</strong>
                <span>{cooldown.label}</span>
                <small>{cooldown.remaining > 0 ? `${cooldown.remaining.toFixed(1)}s` : "Ready"}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="hud-panel">
          <p className="hud-kicker">Combat Feed</p>
          <div className="combat-feed">
            {runtime.combatFeed.map((entry) => (
              <div key={entry.id} className="feed-entry">
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
