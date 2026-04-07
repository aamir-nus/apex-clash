import { apiBaseUrl } from "../config/api";

async function request(path, token, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload.data;
}

export function fetchPlayerProfile(token) {
  return request("/player/profile", token);
}

export function updatePlayerClassType(token, classType) {
  return request("/player/profile/class", token, {
    method: "PUT",
    body: JSON.stringify({ classType })
  });
}

export function updatePlayerSessionState(token, sessionUpdate) {
  return request("/player/session-state", token, {
    method: "PUT",
    body: JSON.stringify(sessionUpdate)
  });
}

export function claimPlayerReward(token, rewardSource, rewardContext = {}) {
  return request("/player/rewards/claim", token, {
    method: "POST",
    body: JSON.stringify({ rewardSource, ...rewardContext })
  });
}

export function applyPlayerLevelChoice(token, optionId, runtimeState) {
  return request("/player/progression/choice", token, {
    method: "PUT",
    body: JSON.stringify({ optionId, runtimeState })
  });
}

export function applyPlayerCombatReward(token, rewardState) {
  return request("/player/progression/reward", token, {
    method: "PUT",
    body: JSON.stringify(rewardState)
  });
}

export function equipPlayerItem(token, itemId) {
  return request("/player/loadout/item", token, {
    method: "PUT",
    body: JSON.stringify({ itemId })
  });
}

export function equipPlayerSkills(token, skillIds) {
  return request("/player/loadout/skills", token, {
    method: "PUT",
    body: JSON.stringify({ skillIds })
  });
}
