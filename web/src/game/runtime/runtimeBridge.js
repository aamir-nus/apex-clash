const runtimeEventName = "apex-clash:runtime-update";
const soundEventName = "apex-clash:sound-event";

export function emitRuntimeUpdate(detail) {
  window.dispatchEvent(new CustomEvent(runtimeEventName, { detail }));
}

export function subscribeToRuntimeUpdates(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(runtimeEventName, listener);
  return () => window.removeEventListener(runtimeEventName, listener);
}

export function emitSoundEvent(detail) {
  window.dispatchEvent(new CustomEvent(soundEventName, { detail }));
}

export function subscribeToSoundEvents(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(soundEventName, listener);
  return () => window.removeEventListener(soundEventName, listener);
}
