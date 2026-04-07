import { logger } from "../lib/logger.js";
import {
  applyPlayerCombatReward,
  applyPlayerProgressionChoice,
  claimPlayerReward,
  equipPlayerItem,
  equipPlayerSkills,
  getOrCreatePlayerProfile,
  setPlayerClassType,
  updatePlayerSessionState
} from "../services/playerProfileService.js";

function requireAuth(request, response) {
  if (!request.authUser) {
    response.status(401).json({ ok: false, error: "Not authenticated" });
    return false;
  }

  return true;
}

export async function getPlayerProfile(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  response.json({
    ok: true,
    data: await getOrCreatePlayerProfile(request.authUser.id)
  });
}

export async function updatePlayerClass(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await setPlayerClassType(request.authUser.id, request.body?.classType);
  if (result.error) {
    logger.warn("Rejected player class update", {
      requestId: request.id,
      classType: request.body?.classType,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function equipPlayerInventoryItem(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await equipPlayerItem(request.authUser.id, request.body?.itemId);
  if (result.error) {
    logger.warn("Rejected inventory equip", {
      requestId: request.id,
      itemId: request.body?.itemId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function equipPlayerLoadoutSkills(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await equipPlayerSkills(request.authUser.id, request.body?.skillIds ?? []);
  if (result.error) {
    logger.warn("Rejected skill equip", {
      requestId: request.id,
      skillIds: request.body?.skillIds,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function applyPlayerLevelChoice(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await applyPlayerProgressionChoice(
    request.authUser.id,
    request.body?.optionId,
    request.body?.runtimeState ?? {}
  );

  if (result.error) {
    logger.warn("Rejected progression choice", {
      requestId: request.id,
      optionId: request.body?.optionId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result.profile });
}

export async function applyPlayerCombatProgression(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await applyPlayerCombatReward(request.authUser.id, request.body ?? {});
  response.json({ ok: true, data: result.profile });
}

export async function updatePlayerSession(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await updatePlayerSessionState(request.authUser.id, request.body ?? {});
  response.json({ ok: true, data: result.profile });
}

export async function claimPlayerDungeonReward(request, response) {
  if (!requireAuth(request, response)) {
    return;
  }

  const result = await claimPlayerReward(
    request.authUser.id,
    request.body?.rewardSource,
    request.body?.regionId,
    request.body?.sessionState ?? null
  );
  if (result.error) {
    logger.warn("Rejected reward claim", {
      requestId: request.id,
      rewardSource: request.body?.rewardSource,
      regionId: request.body?.regionId,
      userId: request.authUser.id
    });
    response.status(400).json({ ok: false, error: result.error });
    return;
  }

  response.json({ ok: true, data: result });
}
