export function SceneTransitionOverlay({ transition }) {
  if (!transition?.active) {
    return null;
  }

  return (
    <div className="transition-overlay">
      <div className="transition-panel">
        <p className="hud-kicker">Transition</p>
        <h3>{transition.label ?? "Changing scene"}</h3>
        <p className="overlay-copy">{transition.detail ?? "Preparing next area..."}</p>
      </div>
    </div>
  );
}
