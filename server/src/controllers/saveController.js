import { logger } from "../lib/logger.js";
import { getClassDefinition } from "../services/contentService.js";
import {
  createSaveSlotRecord,
  getNextSaveSlotId,
  getSaveSlotById,
  listSaveSlotsByOwner,
  updateSaveSlotRecord
} from "../services/saveSlotRepository.js";

function createDefaultPlayerState(archetypeId = "close_combat") {
  const classDefinition = getClassDefinition(archetypeId);

  return {
    level: 1,
    xp: 0,
    xpToNextLevel: 30,
    hp: classDefinition?.baseStats?.hp ?? 120,
    maxHp: classDefinition?.baseStats?.hp ?? 120,
    ce: classDefinition?.baseStats?.ce ?? 70,
    maxCe: classDefinition?.baseStats?.ce ?? 70,
    attack: classDefinition?.baseStats?.attack ?? 16,
    defense: classDefinition?.baseStats?.defense ?? 10,
    speed: classDefinition?.baseStats?.speed ?? 12,
    pendingStatPoints: 0
  };
}

export async function listSaveSlots(request, response) {
  const visibleSlots = await listSaveSlotsByOwner(request.authUser?.id ?? null);

  response.json({
    ok: true,
    data: visibleSlots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      level: slot.level,
      regionId: slot.regionId,
      archetypeId: slot.archetypeId
    }))
  });
}

export async function getSaveSlot(request, response) {
  const slot = await getSaveSlotById(request.params.slotId);

  if (!slot || (slot.ownerUserId && slot.ownerUserId !== request.authUser?.id)) {
    response.status(404).json({ ok: false, error: "Save slot not found" });
    return;
  }

  response.json({
    ok: true,
    data: {
      ...structuredClone(slot)
    }
  });
}

export async function createSaveSlot(request, response) {
  const archetypeId = request.body?.archetypeId ?? "close_combat";
  const classDefinition = getClassDefinition(archetypeId);

  if (!classDefinition) {
    logger.warn("Rejected save slot create for invalid archetype", {
      requestId: request.id,
      archetypeId
    });
    response.status(400).json({
      ok: false,
      error: "Invalid archetypeId"
    });
    return;
  }

  const nextSlotId = await getNextSaveSlotId();
  const nextSlot = {
    id: nextSlotId,
    label: request.body?.label ?? `Save ${nextSlotId.replace("slot-", "")}`,
    level: 1,
    regionId: "hub_blacksite",
    archetypeId,
    ownerUserId: request.authUser?.id ?? null,
    playerState: createDefaultPlayerState(archetypeId),
    sessionSummary: {
      enemiesRemaining: 3,
      combatFeed: []
    }
  };

  const createdSlot = await createSaveSlotRecord(nextSlot);
  logger.info("Save slot created", {
    requestId: request.id,
    slotId: createdSlot.id,
    archetypeId: createdSlot.archetypeId,
    ownerUserId: createdSlot.ownerUserId,
    persistence: "repository"
  });
  response.status(201).json({ ok: true, data: createdSlot });
}

export async function updateSaveSlot(request, response) {
  const slot = await getSaveSlotById(request.params.slotId);
  if (!slot || (slot.ownerUserId && slot.ownerUserId !== request.authUser?.id)) {
    logger.warn("Rejected save slot update for missing slot", {
      requestId: request.id,
      slotId: request.params.slotId
    });
    response.status(404).json({ ok: false, error: "Save slot not found" });
    return;
  }

  const payload = request.body ?? {};
  const updatedSlot = await updateSaveSlotRecord(slot.id, payload);

  logger.info("Save slot updated", {
    requestId: request.id,
    slotId: updatedSlot.id,
    level: updatedSlot.level,
    enemiesRemaining: updatedSlot.sessionSummary.enemiesRemaining,
    ownerUserId: updatedSlot.ownerUserId,
    persistence: "repository"
  });
  response.json({ ok: true, data: updatedSlot });
}
