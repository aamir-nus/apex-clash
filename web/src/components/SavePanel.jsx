export function SavePanel({
  slots,
  status,
  error,
  selectedSlotId,
  setSelectedSlotId,
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
      <p className="save-meta">Save status: {saveStatus || status}</p>
      {error ? <p className="error-text">{error}</p> : null}
    </aside>
  );
}
