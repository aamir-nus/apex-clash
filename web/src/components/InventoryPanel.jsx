export function InventoryPanel({ items, equippedItems, onEquip, locked }) {
  return (
    <section className="panel">
      <h2>Inventory</h2>
      {locked ? <p className="hero-text">Login to manage persistent gear and loadout.</p> : null}
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
