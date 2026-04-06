import { useEffect, useState } from "react";
import { createSaveSlot, fetchSaveSlots, updateSaveSlot } from "../api/saveApi";

export function useSaveSlots(selectedArchetype, runtime) {
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      setStatus("loading");
      try {
        const data = await fetchSaveSlots();
        if (!active) {
          return;
        }

        setSlots(data);
        setSelectedSlotId((current) => current || data[0]?.id || "");
        setStatus("ready");
      } catch {
        if (!active) {
          return;
        }

        setStatus("degraded");
        setError("Save API unavailable.");
      }
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, []);

  async function createSlot() {
    const data = await createSaveSlot(selectedArchetype);
    setSlots((current) => [...current, data]);
    setSelectedSlotId(data.id);
    return data;
  }

  async function saveCurrentRun() {
    const slotId = selectedSlotId || (await createSlot()).id;

    const updated = await updateSaveSlot(slotId, {
      archetypeId: selectedArchetype,
      level: runtime.player.level,
      playerState: {
        level: runtime.player.level,
        xp: runtime.player.xp,
        xpToNextLevel: runtime.player.xpToNextLevel,
        hp: runtime.player.hp,
        maxHp: runtime.player.maxHp,
        ce: runtime.player.ce,
        maxCe: runtime.player.maxCe,
        attack: runtime.player.attack,
        defense: runtime.player.defense,
        speed: runtime.player.speed,
        pendingStatPoints: runtime.player.pendingStatPoints
      },
      sessionSummary: {
        enemiesRemaining: runtime.encounter.enemiesRemaining,
        combatFeed: runtime.combatFeed.slice(0, 3)
      }
    });

    setSlots((current) => current.map((slot) => (slot.id === updated.id ? updated : slot)));
    setSelectedSlotId(updated.id);
    return updated;
  }

  return {
    slots,
    status,
    error,
    selectedSlotId,
    setSelectedSlotId,
    createSlot,
    saveCurrentRun
  };
}
