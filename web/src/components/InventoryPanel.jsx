export function InventoryPanel({ items, equippedItems, latestReward, onEquip, locked }) {
  const canQuickEquipReward =
    latestReward && latestReward.type !== "scroll" && Boolean(latestReward.equipSlot);

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
          {latestReward.bonusRewards?.length ? (
            <small>
              Bonus loot: {latestReward.bonusRewards.map((item) => item.name).join(", ")}
            </small>
          ) : null}
          {canQuickEquipReward ? (
            <button
              className="mini-button"
              disabled={locked}
              onClick={() => onEquip(latestReward)}
              type="button"
            >
              Quick equip
            </button>
          ) : (
            <small>Unlocked scrolls are managed in the moveset panel.</small>
          )}
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
            disabled={locked || !item.equipSlot}
            onClick={() => onEquip(item)}
            type="button"
          >
            <strong>{item.name}</strong>
            <span>{item.type}</span>
            <small>{item.equipSlot ? item.rarity : `${item.rarity} · stash`}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
