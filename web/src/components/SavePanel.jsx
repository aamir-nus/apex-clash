export function SavePanel({
  slots,
  status,
  error,
  backgroundSync,
  profileResumeRegion,
  activeSave,
  selectedSlotId,
  setSelectedSlotId,
  onUseProfileResume,
  onCreateSlot,
  onSaveCurrentRun,
  saveStatus
}) {
  const usingSnapshot = Boolean(selectedSlotId);
  const resumeModeLabel = usingSnapshot ? `save snapshot (${selectedSlotId})` : "live profile session";
  const resumeConsequence = usingSnapshot
    ? `You will reopen the pinned checkpoint at ${activeSave?.regionId ?? "the saved region"} and ignore newer live route drift.`
    : `You will reopen the latest backend-owned route state at ${profileResumeRegion || "hub_jujutsu_high"}.`;

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Save Slots</h2>
        <button className="mini-button" onClick={onCreateSlot} type="button">
          New
        </button>
      </div>
      <div className="panel-guide">
        <strong>Run Recovery</strong>
        <small>
          Use live profile for the latest server-owned route state. Use a snapshot when you want to pin a specific checkpoint.
        </small>
      </div>
      <div className="save-mode-block">
        <button
          className={!selectedSlotId ? "slot-card active" : "slot-card"}
          onClick={onUseProfileResume}
          type="button"
        >
          <strong>Live Profile Resume</strong>
          <span>{profileResumeRegion || "hub_jujutsu_high"}</span>
          <small>Use backend session state</small>
          <small className="slot-impact">Tracks the newest unlocked route and live session sync.</small>
        </button>
      </div>
      <div className="slot-list">
        {slots.map((slot) => (
          <button
            key={slot.id}
            className={slot.id === selectedSlotId ? "slot-card active" : "slot-card"}
            onClick={() => setSelectedSlotId(slot.id)}
            type="button"
          >
            <strong>{slot.label}</strong>
            <span>Level {slot.level}</span>
            <small>{slot.regionId}</small>
            <small>{slot.archetypeId}</small>
            <small className="slot-impact">Pins this checkpoint until you switch back to live profile.</small>
          </button>
        ))}
      </div>
      <button className="primary-button" onClick={onSaveCurrentRun} type="button">
        Sync Current Run
      </button>
      <div className="save-status-grid">
        <p className="save-meta">
          <strong>Resume mode</strong>
          <span>{resumeModeLabel}</span>
        </p>
        <p className="save-meta">
          <strong>Save status</strong>
          <span>{saveStatus || status}</span>
        </p>
        <p className="save-meta">
          <strong>Background sync</strong>
          <span>{backgroundSync?.detail || backgroundSync?.state || "idle"}</span>
        </p>
        <p className="save-meta save-meta-wide">
          <strong>Resume consequence</strong>
          <span>{resumeConsequence}</span>
        </p>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </aside>
  );
}
