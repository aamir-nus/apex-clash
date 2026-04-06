import { logger } from "../lib/logger.js";

function createDefaultPlayerState(_archetypeId = "close_combat") {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: 30,
    hp: 120,
    maxHp: 120,
    ce: 70,
    maxCe: 70,
    attack: 16,
    defense: 10,
    speed: 12,
    pendingStatPoints: 0
  };
}

const saveSlots = [
  {
    id: "slot-1",
    label: "Vertical Slice",
    level: 1,
    regionId: "hub_blacksite",
    archetypeId: "close_combat",
    playerState: createDefaultPlayerState("close_combat"),
    sessionSummary: {
      enemiesRemaining: 3,
      combatFeed: []
    }
  }
];

export function listSaveSlots(_request, response) {
  response.json({
    ok: true,
    data: saveSlots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      level: slot.level,
      regionId: slot.regionId,
      archetypeId: slot.archetypeId
    }))
  });
}

export function getSaveSlot(request, response) {
  const slot = saveSlots.find((entry) => entry.id === request.params.slotId);

  if (!slot) {
    response.status(404).json({ ok: false, error: "Save slot not found" });
    return;
  }

  response.json({
    ok: true,
    data: {
      ...slot
    }
  });
}

export function createSaveSlot(request, response) {
  const nextSlot = {
    id: `slot-${saveSlots.length + 1}`,
    label: request.body?.label ?? `Save ${saveSlots.length + 1}`,
    level: 1,
    regionId: "hub_blacksite",
    archetypeId: request.body?.archetypeId ?? "close_combat",
    playerState: createDefaultPlayerState(request.body?.archetypeId),
    sessionSummary: {
      enemiesRemaining: 3,
      combatFeed: []
    }
  };

  saveSlots.push(nextSlot);
  logger.info("Save slot created", {
    requestId: request.id,
    slotId: nextSlot.id,
    archetypeId: nextSlot.archetypeId
  });
  response.status(201).json({ ok: true, data: nextSlot });
}

export function updateSaveSlot(request, response) {
  const slot = saveSlots.find((entry) => entry.id === request.params.slotId);
  if (!slot) {
    response.status(404).json({ ok: false, error: "Save slot not found" });
    return;
  }

  const payload = request.body ?? {};
  Object.assign(slot, {
    ...payload,
    level: payload.level ?? payload.playerState?.level ?? slot.level,
    playerState: {
      ...slot.playerState,
      ...(payload.playerState ?? {})
    },
    sessionSummary: {
      ...slot.sessionSummary,
      ...(payload.sessionSummary ?? {})
    }
  });

  logger.info("Save slot updated", {
    requestId: request.id,
    slotId: slot.id,
    level: slot.level,
    enemiesRemaining: slot.sessionSummary.enemiesRemaining
  });
  response.json({ ok: true, data: slot });
}
