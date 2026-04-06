export function SavePanel({
  slots,
  status,
  error,
  backgroundSync,
  profileResumeRegion,
  selectedSlotId,
  setSelectedSlotId,
  onUseProfileResume,
  onCreateSlot,
  onSaveCurrentRun,
  saveStatus
}) {
  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Save Slots</h2>
        <button className="mini-button" onClick={onCreateSlot} type="button">
          New
        </button>
      </div>
      <div className="save-mode-block">
        <button
          className={!selectedSlotId ? "slot-card active" : "slot-card"}
          onClick={onUseProfileResume}
          type="button"
        >
          <strong>Live Profile Resume</strong>
          <span>{profileResumeRegion || "hub_blacksite"}</span>
          <small>Use backend session state</small>
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
            <small>{slot.archetypeId}</small>
          </button>
        ))}
      </div>
      <button className="primary-button" onClick={onSaveCurrentRun} type="button">
        Sync Current Run
      </button>
      <p className="save-meta">
        Resume mode: {selectedSlotId ? `save snapshot (${selectedSlotId})` : "live profile session"}
      </p>
      <p className="save-meta">Save status: {saveStatus || status}</p>
      <p className="save-meta">
        Background sync: {backgroundSync?.detail || backgroundSync?.state || "idle"}
      </p>
      {error ? <p className="error-text">{error}</p> : null}
    </aside>
  );
}
