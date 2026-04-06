import { emitLevelChoice } from "../game/runtime/runtimeBridge";

export function LevelUpPanel({ runtime }) {
  if (!runtime.levelUp?.available) {
    return null;
  }

  return (
    <div className="overlay-panel levelup-panel">
      <p className="hud-kicker">Level Up</p>
      <h3>Choose a stat focus</h3>
      <p className="overlay-copy">
        Spend 1 point now. Remaining points: {runtime.player.pendingStatPoints}
      </p>
      <div className="levelup-grid">
        {runtime.levelUp.options.map((option) => (
          <button
            key={option.id}
            className="levelup-card"
            onClick={() => emitLevelChoice({ optionId: option.id })}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
