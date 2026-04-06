import { useEffect, useState } from "react";
import { createSaveSlot, fetchSaveSlot, fetchSaveSlots, updateSaveSlot } from "../api/saveApi";

export function useSaveSlots(selectedArchetype, runtime, authToken) {
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [activeSave, setActiveSave] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      setStatus("loading");
      try {
        const data = await fetchSaveSlots(authToken);
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
  }, [authToken]);

  useEffect(() => {
    let active = true;

    async function loadSelectedSlot() {
      if (!selectedSlotId) {
        setActiveSave(null);
        return;
      }

      try {
        const data = await fetchSaveSlot(selectedSlotId, authToken);
        if (active) {
          setActiveSave(data);
        }
      } catch {
        if (active) {
          setActiveSave(null);
        }
      }
    }

    loadSelectedSlot();

    return () => {
      active = false;
    };
  }, [authToken, selectedSlotId]);

  async function createSlot() {
    const data = await createSaveSlot(selectedArchetype, authToken);
    setSlots((current) => [...current, data]);
    setSelectedSlotId(data.id);
    setActiveSave(data);
    return data;
  }

  async function saveCurrentRun() {
    const slotId = selectedSlotId || (await createSlot()).id;
    const regionId =
      runtime.scene.scene === "boss"
        ? "boss_vault"
        : runtime.scene.scene === "dungeon"
          ? "shatter_dungeon"
          : runtime.scene.scene === "region"
            ? "shatter_block"
            : "hub_blacksite";

    const updated = await updateSaveSlot(slotId, {
      archetypeId: selectedArchetype,
      regionId,
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
        combatFeed: runtime.combatFeed.slice(0, 3),
        sessionState: runtime.sessionState ?? {}
      }
    }, authToken);

    setSlots((current) => current.map((slot) => (slot.id === updated.id ? updated : slot)));
    setSelectedSlotId(updated.id);
    setActiveSave(updated);
    return updated;
  }

  return {
    slots,
    status,
    error,
    selectedSlotId,
    setSelectedSlotId,
    activeSave,
    createSlot,
    saveCurrentRun
  };
}
