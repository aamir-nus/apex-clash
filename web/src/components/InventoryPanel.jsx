export function InventoryPanel({ items, equippedItems, latestReward, onEquip, locked }) {
  return (
    <section className="panel">
      <h2>Inventory</h2>
      {locked ? <p className="hero-text">Login to manage persistent gear and loadout.</p> : null}
      {latestReward ? (
        <div className="reward-card">
          <strong>New reward: {latestReward.name}</strong>
          <span>
            {latestReward.type} · {latestReward.rarity}
          </span>
          <button className="mini-button" disabled={locked} onClick={() => onEquip(latestReward)} type="button">
            Quick equip
          </button>
        </div>
      ) : null}
      <div className="inventory-equipped">
        {equippedItems.map((item) => (
          <div key={item.id} className="inventory-slot">
            <strong>{item.equipSlot}</strong>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <div className="inventory-list">
        {items.map((item) => (
          <button
            key={item.id}
            className="slot-card"
            disabled={locked}
            onClick={() => onEquip(item)}
            type="button"
          >
            <strong>{item.name}</strong>
            <span>{item.type}</span>
            <small>{item.rarity}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
