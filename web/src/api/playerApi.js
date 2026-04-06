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
