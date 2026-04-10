import { apiBaseUrl } from "../config/api";

async function request(path, options = {}) {
  const { headers: callerHeaders, ...restOptions } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(callerHeaders ?? {})
    },
    ...restOptions
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}

export function fetchSaveSlots(token) {
  return request("/save-slots", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export function createSaveSlot(archetypeId, token) {
  return request("/save-slots", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify({
      archetypeId,
      label: "Browser Slice"
    })
  });
}

export function fetchSaveSlot(slotId, token) {
  return request(`/save/${slotId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export function updateSaveSlot(slotId, data, token) {
  return request(`/save/${slotId}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(data)
  });
}
