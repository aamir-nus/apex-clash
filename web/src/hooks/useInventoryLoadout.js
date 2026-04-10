import { useMemo, useState } from "react";

const starterItems = {
  striker: { weapon: "breach_blade", charm: "rust_talisman" },
  technique_fighter: { weapon: "pulse_tanto", charm: "focus_charm" },
  projection_sorcerer: { weapon: "ritual_focus", charm: "focus_charm" },
  heavenly_restriction: { weapon: "grave_polearm", charm: "hunter_sash" }
};

export function useInventoryLoadout(content, selectedArchetype) {
  const [equipped, setEquipped] = useState(starterItems);

  const compatibleItems = useMemo(
    () =>
      (content?.items ?? []).filter((item) => {
        if (!item.classRestrictions?.length) {
          return true;
        }
        return item.classRestrictions.includes(selectedArchetype);
      }),
    [content, selectedArchetype]
  );

  const equippedIds = equipped[selectedArchetype] ?? {};
  const equippedItems = compatibleItems.filter(
    (item) => equippedIds[item.equipSlot] && equippedIds[item.equipSlot] === item.id
  );

  function equipItem(item) {
    setEquipped((current) => ({
      ...current,
      [selectedArchetype]: {
        ...(current[selectedArchetype] ?? {}),
        [item.equipSlot]: item.id
      }
    }));
  }

  return {
    compatibleItems,
    equippedItems,
    equipItem
  };
}
