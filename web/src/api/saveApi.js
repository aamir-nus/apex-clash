import { apiBaseUrl } from "../config/api";

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.data;
}

export function fetchSaveSlots() {
  return request("/save-slots");
}

export function createSaveSlot(archetypeId) {
  return request("/save-slots", {
    method: "POST",
    body: JSON.stringify({
      archetypeId,
      label: "Browser Slice"
    })
  });
}

export function updateSaveSlot(slotId, data) {
  return request(`/save/${slotId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}
