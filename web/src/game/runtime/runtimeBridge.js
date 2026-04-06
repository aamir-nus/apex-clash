const runtimeEventName = "apex-clash:runtime-update";
const soundEventName = "apex-clash:sound-event";
const sceneEventName = "apex-clash:scene-update";
const transitionEventName = "apex-clash:transition-update";
const levelChoiceEventName = "apex-clash:level-choice";
const progressionRewardEventName = "apex-clash:progression-reward";
const inventoryRewardEventName = "apex-clash:inventory-reward";

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

export function emitSceneUpdate(detail) {
  window.dispatchEvent(new CustomEvent(sceneEventName, { detail }));
}

export function subscribeToSceneUpdates(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(sceneEventName, listener);
  return () => window.removeEventListener(sceneEventName, listener);
}

export function emitTransitionUpdate(detail) {
  window.dispatchEvent(new CustomEvent(transitionEventName, { detail }));
}

export function subscribeToTransitionUpdates(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(transitionEventName, listener);
  return () => window.removeEventListener(transitionEventName, listener);
}

export function emitLevelChoice(detail) {
  window.dispatchEvent(new CustomEvent(levelChoiceEventName, { detail }));
}

export function subscribeToLevelChoices(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(levelChoiceEventName, listener);
  return () => window.removeEventListener(levelChoiceEventName, listener);
}

export function emitProgressionReward(detail) {
  window.dispatchEvent(new CustomEvent(progressionRewardEventName, { detail }));
}

export function subscribeToProgressionRewards(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(progressionRewardEventName, listener);
  return () => window.removeEventListener(progressionRewardEventName, listener);
}

export function emitInventoryReward(detail) {
  window.dispatchEvent(new CustomEvent(inventoryRewardEventName, { detail }));
}

export function subscribeToInventoryRewards(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(inventoryRewardEventName, listener);
  return () => window.removeEventListener(inventoryRewardEventName, listener);
}
