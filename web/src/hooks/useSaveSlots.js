import { useEffect, useMemo, useRef, useState } from "react";
import { createSaveSlot, fetchSaveSlot, fetchSaveSlots, updateSaveSlot } from "../api/saveApi";
import { updatePlayerSessionState } from "../api/playerApi";

export function useSaveSlots(selectedArchetype, runtime, authToken, onProfileSynced) {
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [activeSave, setActiveSave] = useState(null);
  const lastSyncedSignatureRef = useRef("");
  const backgroundRequestIdRef = useRef(0);
  const [backgroundSync, setBackgroundSync] = useState({
    state: "idle",
    detail: ""
  });

  const savePayload = useMemo(() => {
    const regionId = runtime.regionId ?? "hub_blacksite";

    return {
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
    };
  }, [runtime, selectedArchetype]);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      setStatus("loading");
      setError("");
      try {
        const data = await fetchSaveSlots(authToken);
        if (!active) {
          return;
        }

        setSlots(data);
        setSelectedSlotId((current) => current);
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
          setError("");
        }
      } catch {
        if (active) {
          setActiveSave(null);
          setError("Selected save failed to load.");
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
    setBackgroundSync({
      state: "idle",
      detail: "slot created"
    });
    return data;
  }

  async function saveCurrentRun() {
    const slotId = selectedSlotId || (await createSlot()).id;
    const updated = await updateSaveSlot(slotId, savePayload, authToken);

    setSlots((current) => current.map((slot) => (slot.id === updated.id ? updated : slot)));
    setSelectedSlotId(updated.id);
    setActiveSave(updated);
    lastSyncedSignatureRef.current = JSON.stringify({
      slotId: updated.id,
      payload: savePayload
    });
    setError("");
    setBackgroundSync({
      state: "synced",
      detail: `manual sync: ${updated.regionId}`
    });
    return updated;
  }

  useEffect(() => {
    if (!authToken || status !== "ready") {
      return undefined;
    }

    const nextSignature = JSON.stringify({
      sessionScope: selectedSlotId ?? "live-profile",
      payload: savePayload
    });

    if (lastSyncedSignatureRef.current === nextSignature) {
      return undefined;
    }

    setBackgroundSync({
      state: "pending",
      detail: `background sync: ${savePayload.regionId}`
    });
    const requestId = backgroundRequestIdRef.current + 1;
    backgroundRequestIdRef.current = requestId;
    const syncDelayMs = savePayload.sessionSummary.sessionState?.clearedBossRegionId ? 0 : 700;

    const timer = window.setTimeout(async () => {
      try {
        const updatedProfile = await updatePlayerSessionState(authToken, {
          regionId: savePayload.regionId,
          unlockedRegionIds: savePayload.sessionSummary.sessionState?.unlockedRegionIds ?? [],
          sessionState: savePayload.sessionSummary.sessionState
        });
        if (backgroundRequestIdRef.current !== requestId) {
          return;
        }

        lastSyncedSignatureRef.current = nextSignature;
        onProfileSynced?.(updatedProfile);
        setError("");
        setBackgroundSync({
          state: "synced",
          detail: `session sync: ${updatedProfile.currentRegionId}`
        });
      } catch (syncError) {
        if (backgroundRequestIdRef.current !== requestId) {
          return;
        }

        window.console.error("Background save sync failed", {
          slotId: selectedSlotId ?? null,
          regionId: savePayload.regionId,
          scene: runtime.scene.scene,
          message: syncError?.message ?? "Unknown error"
        });
        setError("Background save sync failed.");
        setBackgroundSync({
          state: "error",
          detail: `background sync failed: ${savePayload.regionId}`
        });
      }
    }, syncDelayMs);

    return () => window.clearTimeout(timer);
  }, [authToken, onProfileSynced, runtime.scene.scene, savePayload, selectedSlotId, status]);

  return {
    slots,
    status,
    error,
    backgroundSync,
    selectedSlotId,
    setSelectedSlotId,
    activeSave,
    createSlot,
    saveCurrentRun
  };
}
