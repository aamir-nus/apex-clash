import mongoose from "mongoose";
import { SaveSlotModel } from "../models/SaveSlot.js";

const defaultGuestSlot = {
  id: "slot-1",
  label: "Vertical Slice",
  level: 1,
  regionId: "hub_blacksite",
  archetypeId: "close_combat",
  ownerUserId: null,
  playerState: {
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
  },
  sessionSummary: {
    enemiesRemaining: 3,
    combatFeed: []
  }
};

const inMemorySaveSlots = [structuredClone(defaultGuestSlot)];

function clone(value) {
  return structuredClone(value);
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function serializeMongoSlot(document) {
  return {
    id: document.slotId,
    label: document.label,
    level: document.level,
    regionId: document.regionId,
    archetypeId: document.archetypeId,
    ownerUserId: document.ownerUserId ?? null,
    playerState: clone(document.playerState),
    sessionSummary: clone(document.sessionSummary)
  };
}

export async function listSaveSlotsByOwner(ownerUserId) {
  if (!isMongoReady()) {
    return inMemorySaveSlots
      .filter((slot) => (slot.ownerUserId ?? null) === (ownerUserId ?? null))
      .map(clone);
  }

  const documents = await SaveSlotModel.find({ ownerUserId: ownerUserId ?? null })
    .sort({ createdAt: 1 })
    .lean();
  return documents.map(serializeMongoSlot);
}

export async function getSaveSlotById(slotId) {
  if (!isMongoReady()) {
    const slot = inMemorySaveSlots.find((entry) => entry.id === slotId);
    return slot ? clone(slot) : null;
  }

  const document = await SaveSlotModel.findOne({ slotId }).lean();
  return document ? serializeMongoSlot(document) : null;
}

export async function getNextSaveSlotId() {
  if (!isMongoReady()) {
    return `slot-${inMemorySaveSlots.length + 1}`;
  }

  const count = await SaveSlotModel.countDocuments();
  return `slot-${count + 1}`;
}

export async function createSaveSlotRecord(slot) {
  if (!isMongoReady()) {
    inMemorySaveSlots.push(clone(slot));
    return clone(slot);
  }

  const document = await SaveSlotModel.create({
    slotId: slot.id,
    label: slot.label,
    level: slot.level,
    regionId: slot.regionId,
    archetypeId: slot.archetypeId,
    ownerUserId: slot.ownerUserId,
    playerState: slot.playerState,
    sessionSummary: slot.sessionSummary
  });

  return serializeMongoSlot(document.toObject());
}

export async function updateSaveSlotRecord(slotId, payload) {
  if (!isMongoReady()) {
    const slot = inMemorySaveSlots.find((entry) => entry.id === slotId);
    if (!slot) {
      return null;
    }

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

    return clone(slot);
  }

  const document = await SaveSlotModel.findOne({ slotId });
  if (!document) {
    return null;
  }

  document.label = payload.label ?? document.label;
  document.regionId = payload.regionId ?? document.regionId;
  document.archetypeId = payload.archetypeId ?? document.archetypeId;
  document.level = payload.level ?? payload.playerState?.level ?? document.level;
  document.playerState = {
    ...clone(document.playerState),
    ...(payload.playerState ?? {})
  };
  document.sessionSummary = {
    ...clone(document.sessionSummary),
    ...(payload.sessionSummary ?? {})
  };

  await document.save();
  return serializeMongoSlot(document.toObject());
}
