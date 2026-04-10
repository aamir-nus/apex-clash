export function InventoryPanel({
  items,
  equippedItems,
  craftRecipes,
  activeConsumableIds,
  latestReward,
  loadoutFeedback,
  onEquip,
  onUse,
  onCraft,
  locked
}) {
  const formatModifiers = (statModifiers = {}) => {
    const entries = Object.entries(statModifiers).filter(([, value]) => value);
    if (!entries.length) {
      return "No direct stat shift";
    }

    return entries
      .map(([key, value]) => `${key.toUpperCase()} ${value > 0 ? "+" : ""}${value}`)
      .join(" · ");
  };

  const latestImpactText = loadoutFeedback?.statDelta?.length
    ? loadoutFeedback.statDelta
        .map((entry) => `${entry.key.toUpperCase()} ${entry.delta > 0 ? "+" : ""}${entry.delta}`)
        .join(" · ")
    : null;
  const canQuickEquipReward =
    latestReward && latestReward.type !== "scroll" && Boolean(latestReward.equipSlot);
  const equippedIds = new Set(equippedItems.map((item) => item.id));
  const equippableItems = items.filter((item) => item.equipSlot);
  const stashItems = items.filter((item) => !item.equipSlot);
  const stashConsumables = items.filter((item) => item.type === "consumable" && item.quantity);
  const readyRecipes = craftRecipes.filter((recipe) => recipe.canCraft);
  const showConsumableGuide = !locked && stashConsumables.length > 0;
  const showCraftGuide = !locked && readyRecipes.length > 0;

  return (
    <section className="panel">
      <h2>Inventory</h2>
      {locked ? <p className="hero-text">Login to manage persistent gear and loadout.</p> : null}
      {showConsumableGuide || showCraftGuide ? (
        <div className="inventory-guide">
          <strong>Field Loop</strong>
          {showConsumableGuide ? (
            <small>
              Use tonics from stash before or during a route. Effects sync into the active run immediately.
            </small>
          ) : null}
          {showCraftGuide ? (
            <small>
              Crafting consumes stored materials and drops the finished item straight into inventory.
            </small>
          ) : null}
        </div>
      ) : null}
      {latestReward ? (
        <div className="reward-card">
          <strong>New reward: {latestReward.name}</strong>
          <span>
            {latestReward.type} · {latestReward.rarity}
          </span>
          <small>{formatModifiers(latestReward.statModifiers)}</small>
          {latestReward.bonusRewards?.length ? (
            <small>
              Bonus loot: {latestReward.bonusRewards.map((item) => item.name).join(", ")}
            </small>
          ) : null}
          {latestImpactText ? <small>Current build shift: {latestImpactText}</small> : null}
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
      <div className="inventory-section">
        <div className="panel-header compact">
          <strong>Equippable Gear</strong>
          <small>{equippableItems.length} available</small>
        </div>
        <div className="inventory-list">
          {equippableItems.map((item) => (
            <div key={item.id} className={equippedIds.has(item.id) ? "slot-card inventory-card active-card" : "slot-card inventory-card"}>
              <strong>{item.name}</strong>
              <span>
                {item.type}
                {item.quantity ? ` · x${item.quantity}` : ""}
              </span>
              <small>{equippedIds.has(item.id) ? `${item.rarity} · equipped` : item.rarity}</small>
              <small>{formatModifiers(item.statModifiers)}</small>
              <button
                className="mini-button"
                disabled={locked}
                onClick={() => onEquip(item)}
                type="button"
              >
                {equippedIds.has(item.id) ? "Re-equip" : "Equip"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="inventory-section">
        <div className="panel-header compact">
          <strong>Stash</strong>
          <small>{stashItems.length} items</small>
        </div>
        <div className="inventory-list">
          {stashItems.map((item) => (
          <div key={item.id} className="slot-card inventory-card">
            <strong>{item.name}</strong>
            <span>
              {item.type}
              {item.quantity ? ` · x${item.quantity}` : ""}
            </span>
            <small>{`${item.rarity} · stash`}</small>
            {item.statModifiers && Object.keys(item.statModifiers).length ? (
              <small>{formatModifiers(item.statModifiers)}</small>
            ) : null}
            {item.type === "consumable" ? (
              <button
                className="mini-button"
                disabled={locked || !item.quantity}
                onClick={() => onUse(item)}
                type="button"
              >
                {activeConsumableIds?.includes(item.id) ? "Refresh" : "Use"}
              </button>
            ) : null}
          </div>
          ))}
        </div>
      </div>
      <div className="inventory-crafting">
        <div className="panel-header compact">
          <strong>Crafting</strong>
          <small>{readyRecipes.length} ready</small>
        </div>
        <div className="inventory-list">
          {craftRecipes.map((recipe) => (
            <div key={recipe.id} className={recipe.canCraft ? "slot-card inventory-card active-card" : "slot-card inventory-card"}>
              <strong>{recipe.result?.name ?? "Unknown recipe"}</strong>
              <span>
                {recipe.ingredients.map((ingredient) => `${ingredient.name} x1`).join(" + ")}
              </span>
              <small>
                {recipe.canCraft ? "Ready to craft" : "Missing materials"}
              </small>
              <small>{formatModifiers(recipe.result?.statModifiers)}</small>
              <button
                className="mini-button"
                disabled={locked || !recipe.canCraft}
                onClick={() => onCraft(recipe)}
                type="button"
              >
                Craft
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
